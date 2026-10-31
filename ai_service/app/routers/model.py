import os
import torch
from fastapi import APIRouter
from ..models.gemini_service import GeminiFallbackService
try:
    from training.train import CHECKPOINT_DIR
except ImportError:
    from ...training.train import CHECKPOINT_DIR

router = APIRouter(prefix="/api/model", tags=["Model Diagnostics"])

@router.get("/status")
def get_model_status():
    """
    Get runtime environment diagnostics, model checkpoint status,
    hardware accelerator information, and available summarization engines.
    """
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU (x86_64)"

    # Check checkpoints
    has_custom_checkpoint = False
    active_checkpoint = None
    if os.path.exists(CHECKPOINT_DIR):
        files = [f for f in os.listdir(CHECKPOINT_DIR) if f.endswith(".pt")]
        if files:
            has_custom_checkpoint = True
            active_checkpoint = files[0]

    # Check Gemini fallback
    gemini = GeminiFallbackService()
    gemini_ready = gemini.is_configured()

    return {
        "status": "ready",
        "device": device_name,
        "cuda_available": cuda_available,
        "torch_version": torch.__version__,
        "engines": {
            "textrank": {
                "name": "TextRank Extractive Baseline",
                "status": "active",
                "type": "Extractive Graph-based",
                "description": "PageRank algorithm on TF-IDF cosine similarity sentence graph."
            },
            "custom_seq2seq": {
                "name": "Custom Seq2Seq Attention Model",
                "status": "active" if has_custom_checkpoint else "training_required",
                "type": "Abstractive Deep Learning",
                "architecture": "Bidirectional GRU/LSTM + Bahdanau/Luong Attention + Beam Search",
                "active_checkpoint": active_checkpoint,
                "checkpoint_available": has_custom_checkpoint
            },
            "gemini_fallback": {
                "name": "Gemini API Intelligent Fallback",
                "status": "configured" if gemini_ready else "unconfigured",
                "type": "External Fallback LLM",
                "description": "Configurable fallback triggered on qualifying failures or errors.",
                "model": gemini.model_name
            }
        }
    }
