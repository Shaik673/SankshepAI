import os
import json
import time
import argparse
from typing import Dict, Any, Optional
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

try:
    from app.models.nlp_pipeline import NLPPipeline
    from app.models.seq2seq_attention import Seq2SeqAttentionModel
    from training.dataset import load_or_create_dataset, SummarizationDataset
except (ImportError, ValueError):
    from ..app.models.nlp_pipeline import NLPPipeline
    from ..app.models.seq2seq_attention import Seq2SeqAttentionModel
    from .dataset import load_or_create_dataset, SummarizationDataset

CHECKPOINT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "checkpoints")

def train_seq2seq(
    epochs: int = 5,
    batch_size: int = 2,
    lr: float = 0.001,
    embed_dim: int = 64,
    hidden_dim: int = 128,
    attention_type: str = "bahdanau",
    checkpoint_name: str = "custom_seq2seq_v1.pt",
    progress_callback: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Train or fine-tune custom Seq2Seq Attention summarizer.
    Saves checkpoint and returns training summary with loss history.
    """
    start_time = time.time()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    # Load corpus
    pairs = load_or_create_dataset()
    all_texts = [p["source"] + " " + p["target"] for p in pairs]

    # Build vocabulary
    pipeline = NLPPipeline(max_vocab_size=3000)
    pipeline.build_vocab(all_texts)
    vocab_size = len(pipeline.word2idx)

    # Initialize Dataset and DataLoader
    dataset = SummarizationDataset(pairs, pipeline, max_src_len=100, max_trg_len=50)
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    # Initialize Model
    model = Seq2SeqAttentionModel(
        vocab_size=vocab_size,
        embed_dim=embed_dim,
        hidden_dim=hidden_dim,
        num_encoder_layers=1,
        attention_type=attention_type,
        dropout=0.1,
        device=device
    )

    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.CrossEntropyLoss(ignore_index=NLPPipeline.PAD_IDX)

    loss_history = []
    print(f"[*] Starting training on {device} for {epochs} epochs (Vocab size: {vocab_size})...")

    for epoch in range(1, epochs + 1):
        model.train()
        epoch_loss = 0.0
        batches = 0

        for src, src_len, trg, trg_len in loader:
            src = src.to(device)
            trg = trg.to(device)

            optimizer.zero_grad()
            output = model(src, src_len, trg, teacher_forcing_ratio=0.5)

            # Reshape for CrossEntropyLoss:
            # output: [batch_size, trg_len, vocab_size] -> [batch_size * (trg_len - 1), vocab_size]
            # trg: [batch_size, trg_len] -> [batch_size * (trg_len - 1)]
            output_dim = output.shape[-1]
            loss_output = output[:, 1:].reshape(-1, output_dim)
            loss_trg = trg[:, 1:].reshape(-1)

            loss = criterion(loss_output, loss_trg)
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            epoch_loss += loss.item()
            batches += 1

        avg_loss = round(epoch_loss / max(batches, 1), 4)
        loss_history.append({"epoch": epoch, "loss": avg_loss})
        print(f"[*] Epoch {epoch}/{epochs} - Loss: {avg_loss}")

        if progress_callback:
            progress_callback(epoch, epochs, avg_loss)

    # Save checkpoint
    checkpoint_path = os.path.join(CHECKPOINT_DIR, checkpoint_name)
    torch.save({
        "epoch": epochs,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "vocab": pipeline.word2idx,
        "loss_history": loss_history,
        "hyperparameters": {
            "embed_dim": embed_dim,
            "hidden_dim": hidden_dim,
            "attention_type": attention_type,
            "vocab_size": vocab_size,
        },
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }, checkpoint_path)

    duration = round(time.time() - start_time, 2)
    print(f"[OK] Checkpoint saved successfully at {checkpoint_path} in {duration}s")

    return {
        "status": "completed",
        "epochs": epochs,
        "final_loss": loss_history[-1]["loss"] if loss_history else None,
        "loss_history": loss_history,
        "checkpoint_path": checkpoint_path,
        "checkpoint_name": checkpoint_name,
        "training_time_seconds": duration,
        "vocab_size": vocab_size,
        "device": device
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train SankshepAI Seq2Seq Attention Model")
    parser.add_argument("--epochs", type=int, default=5, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=2, help="Batch size")
    parser.add_argument("--lr", type=float, default=0.001, help="Learning rate")
    parser.add_argument("--attention", type=str, default="bahdanau", choices=["bahdanau", "luong"], help="Attention type")
    parser.add_argument("--name", type=str, default="custom_seq2seq_v1.pt", help="Checkpoint filename")
    args = parser.parse_args()

    train_seq2seq(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        attention_type=args.attention,
        checkpoint_name=args.name
    )
