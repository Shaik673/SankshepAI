import os
import uuid
import threading
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

try:
    from training.train import train_seq2seq, CHECKPOINT_DIR
except ImportError:
    from ...training.train import train_seq2seq, CHECKPOINT_DIR

router = APIRouter(prefix="/api/training", tags=["Model Training"])

# In-memory background training job tracker
training_jobs: Dict[str, Dict[str, Any]] = {}

class StartTrainingRequest(BaseModel):
    epochs: int = Field(5, ge=1, le=50, description="Number of training epochs")
    batch_size: int = Field(2, ge=1, le=32)
    lr: float = Field(0.001, ge=1e-5, le=0.1)
    attention_type: str = Field("bahdanau", choices=["bahdanau", "luong"])
    checkpoint_name: Optional[str] = Field(None, description="Custom filename for checkpoint")

@router.post("/start")
def start_training_job(req: StartTrainingRequest, background_tasks: BackgroundTasks):
    """
    Launch asynchronous training job for the custom Seq2Seq attention model.
    """
    job_id = str(uuid.uuid4())[:8]
    checkpoint_name = req.checkpoint_name or f"seq2seq_{req.attention_type}_{job_id}.pt"

    training_jobs[job_id] = {
        "job_id": job_id,
        "status": "running",
        "current_epoch": 0,
        "total_epochs": req.epochs,
        "current_loss": None,
        "loss_history": [],
        "checkpoint_name": checkpoint_name,
        "error": None
    }

    def run_job():
        def progress_callback(epoch, total_epochs, loss):
            if job_id in training_jobs:
                training_jobs[job_id]["current_epoch"] = epoch
                training_jobs[job_id]["current_loss"] = loss
                training_jobs[job_id]["loss_history"].append({"epoch": epoch, "loss": loss})

        try:
            res = train_seq2seq(
                epochs=req.epochs,
                batch_size=req.batch_size,
                lr=req.lr,
                attention_type=req.attention_type,
                checkpoint_name=checkpoint_name,
                progress_callback=progress_callback
            )
            training_jobs[job_id]["status"] = "completed"
            training_jobs[job_id]["result"] = res
        except Exception as e:
            training_jobs[job_id]["status"] = "failed"
            training_jobs[job_id]["error"] = str(e)

    threading.Thread(target=run_job, daemon=True).start()

    return {
        "status": "started",
        "job_id": job_id,
        "message": f"Training job {job_id} initiated for {req.epochs} epochs.",
        "checkpoint_name": checkpoint_name
    }

@router.get("/status/{job_id}")
def get_training_status(job_id: str):
    """Get real-time status and loss metrics of a training job."""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")
    return training_jobs[job_id]

@router.get("/checkpoints")
def list_checkpoints():
    """List all available model checkpoints and their metadata."""
    if not os.path.exists(CHECKPOINT_DIR):
        return {"checkpoints": []}

    checkpoints = []
    for f in os.listdir(CHECKPOINT_DIR):
        if f.endswith(".pt") or f.endswith(".pth"):
            path = os.path.join(CHECKPOINT_DIR, f)
            size_mb = round(os.path.getsize(path) / (1024 * 1024), 2)
            mod_time = os.path.getmtime(path)
            
            # Inspect checkpoint metadata safely
            meta = {}
            try:
                import torch
                ckpt = torch.load(path, map_location="cpu")
                meta = {
                    "epochs": ckpt.get("epoch"),
                    "loss_history": ckpt.get("loss_history", []),
                    "hyperparameters": ckpt.get("hyperparameters", {}),
                    "saved_at": ckpt.get("timestamp")
                }
            except Exception:
                pass

            checkpoints.append({
                "name": f,
                "size_mb": size_mb,
                "path": path,
                "metadata": meta
            })

    return {"checkpoints": checkpoints}
