import math
import os
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Tuple, Optional, Any
from .nlp_pipeline import NLPPipeline

# ─── Attention Mechanism ──────────────────────────────────────────────────────

class BahdanauAttention(nn.Module):
    """
    Bahdanau (Additive) Attention Mechanism:
    score(s_t, h_i) = v_a^T * tanh(W_a * s_t + U_a * h_i)
    """
    def __init__(self, hidden_dim: int, encoder_dim: int):
        super().__init__()
        self.W_a = nn.Linear(hidden_dim, hidden_dim, bias=False)
        self.U_a = nn.Linear(encoder_dim, hidden_dim, bias=False)
        self.v_a = nn.Linear(hidden_dim, 1, bias=False)

    def forward(self, decoder_hidden: torch.Tensor, encoder_outputs: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        decoder_hidden: [batch_size, hidden_dim]
        encoder_outputs: [batch_size, src_len, encoder_dim]
        mask: [batch_size, src_len] (True for valid tokens, False for padding)
        Returns:
            context: [batch_size, encoder_dim]
            weights: [batch_size, src_len]
        """
        # [batch_size, 1, hidden_dim]
        dec_proj = self.W_a(decoder_hidden).unsqueeze(1)
        # [batch_size, src_len, hidden_dim]
        enc_proj = self.U_a(encoder_outputs)
        
        # [batch_size, src_len, 1] -> [batch_size, src_len]
        energy = self.v_a(torch.tanh(dec_proj + enc_proj)).squeeze(-1)

        if mask is not None:
            energy = energy.masked_fill(~mask, -1e9)

        weights = F.softmax(energy, dim=-1)
        # context = weights @ encoder_outputs: [batch_size, 1, src_len] @ [batch_size, src_len, encoder_dim]
        context = torch.bmm(weights.unsqueeze(1), encoder_outputs).squeeze(1)

        return context, weights


class LuongAttention(nn.Module):
    """
    Luong (Multiplicative / General) Attention:
    score(s_t, h_i) = s_t^T * W_a * h_i
    """
    def __init__(self, hidden_dim: int, encoder_dim: int):
        super().__init__()
        self.W_a = nn.Linear(encoder_dim, hidden_dim, bias=False)

    def forward(self, decoder_hidden: torch.Tensor, encoder_outputs: torch.Tensor, mask: Optional[torch.Tensor] = None) -> Tuple[torch.Tensor, torch.Tensor]:
        # encoder_outputs: [batch_size, src_len, encoder_dim] -> [batch_size, src_len, hidden_dim]
        enc_proj = self.W_a(encoder_outputs)
        # decoder_hidden: [batch_size, hidden_dim, 1]
        dec = decoder_hidden.unsqueeze(2)
        # energy: [batch_size, src_len]
        energy = torch.bmm(enc_proj, dec).squeeze(2)

        if mask is not None:
            energy = energy.masked_fill(~mask, -1e9)

        weights = F.softmax(energy, dim=-1)
        context = torch.bmm(weights.unsqueeze(1), encoder_outputs).squeeze(1)
        return context, weights


# ─── Encoder ──────────────────────────────────────────────────────────────────

class Seq2SeqEncoder(nn.Module):
    """
    Bidirectional GRU / LSTM Encoder.
    """
    def __init__(self, vocab_size: int, embed_dim: int, hidden_dim: int, num_layers: int = 2, dropout: float = 0.2, rnn_type: str = "GRU"):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=NLPPipeline.PAD_IDX)
        self.dropout = nn.Dropout(dropout)
        self.rnn_type = rnn_type.upper()
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers

        RNNClass = nn.GRU if self.rnn_type == "GRU" else nn.LSTM
        self.rnn = RNNClass(
            embed_dim,
            hidden_dim,
            num_layers=num_layers,
            bidirectional=True,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        # Linear layer to combine forward and backward final hidden states for decoder initialization
        self.fc_hidden = nn.Linear(hidden_dim * 2, hidden_dim)

    def forward(self, src: torch.Tensor, src_lengths: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """
        src: [batch_size, src_len]
        src_lengths: [batch_size]
        Returns:
            encoder_outputs: [batch_size, src_len, hidden_dim * 2]
            final_hidden: [batch_size, hidden_dim]
        """
        embedded = self.dropout(self.embedding(src))
        
        # Pack padded sequences for efficient RNN computation
        packed = nn.utils.rnn.pack_padded_sequence(
            embedded, src_lengths.cpu(), batch_first=True, enforce_sorted=False
        )
        packed_outputs, hidden = self.rnn(packed)
        encoder_outputs, _ = nn.utils.rnn.pad_packed_sequence(packed_outputs, batch_first=True, total_length=src.size(1))

        if self.rnn_type == "GRU":
            # hidden: [num_layers * 2, batch_size, hidden_dim]
            # Take last layer's forward and backward hidden states
            forward_h = hidden[-2, :, :]
            backward_h = hidden[-1, :, :]
            final_hidden = torch.tanh(self.fc_hidden(torch.cat((forward_h, backward_h), dim=1)))
        else: # LSTM
            h_n, c_n = hidden
            forward_h = h_n[-2, :, :]
            backward_h = h_n[-1, :, :]
            final_hidden = torch.tanh(self.fc_hidden(torch.cat((forward_h, backward_h), dim=1)))

        return encoder_outputs, final_hidden


# ─── Decoder ──────────────────────────────────────────────────────────────────

class Seq2SeqDecoder(nn.Module):
    """
    Attention-based Decoder.
    Combines embedded input token with attention context vector.
    """
    def __init__(self, vocab_size: int, embed_dim: int, hidden_dim: int, encoder_dim: int, attention_type: str = "bahdanau", dropout: float = 0.2):
        super().__init__()
        self.vocab_size = vocab_size
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=NLPPipeline.PAD_IDX)
        self.dropout = nn.Dropout(dropout)
        
        if attention_type.lower() == "luong":
            self.attention = LuongAttention(hidden_dim, encoder_dim)
        else:
            self.attention = BahdanauAttention(hidden_dim, encoder_dim)

        # Decoder GRU cell: input is concat of (embedding, context)
        self.rnn = nn.GRUCell(embed_dim + encoder_dim, hidden_dim)
        
        # Output projection layer: concat of (decoder_hidden, context, embedding)
        self.fc_out = nn.Linear(hidden_dim + encoder_dim + embed_dim, vocab_size)

    def forward(
        self,
        input_token: torch.Tensor,
        hidden: torch.Tensor,
        encoder_outputs: torch.Tensor,
        mask: Optional[torch.Tensor] = None
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        input_token: [batch_size]
        hidden: [batch_size, hidden_dim]
        encoder_outputs: [batch_size, src_len, encoder_dim]
        Returns:
            prediction: [batch_size, vocab_size]
            next_hidden: [batch_size, hidden_dim]
            attn_weights: [batch_size, src_len]
        """
        embedded = self.dropout(self.embedding(input_token)) # [batch_size, embed_dim]
        context, attn_weights = self.attention(hidden, encoder_outputs, mask)

        rnn_input = torch.cat((embedded, context), dim=1)
        next_hidden = self.rnn(rnn_input, hidden)

        out_input = torch.cat((next_hidden, context, embedded), dim=1)
        prediction = self.fc_out(out_input)

        return prediction, next_hidden, attn_weights


# ─── Full Seq2Seq Model ───────────────────────────────────────────────────────

class Seq2SeqAttentionModel(nn.Module):
    """
    Academic Seq2Seq Model with Attention mechanism and Beam Search Decoding.
    """
    def __init__(
        self,
        vocab_size: int,
        embed_dim: int = 128,
        hidden_dim: int = 256,
        num_encoder_layers: int = 2,
        attention_type: str = "bahdanau",
        dropout: float = 0.2,
        device: str = "cpu"
    ):
        super().__init__()
        self.vocab_size = vocab_size
        self.device = torch.device(device)
        self.encoder = Seq2SeqEncoder(vocab_size, embed_dim, hidden_dim, num_encoder_layers, dropout, "GRU")
        self.decoder = Seq2SeqDecoder(vocab_size, embed_dim, hidden_dim, hidden_dim * 2, attention_type, dropout)
        self.to(self.device)

    def forward(
        self,
        src: torch.Tensor,
        src_lengths: torch.Tensor,
        trg: torch.Tensor,
        teacher_forcing_ratio: float = 0.5
    ) -> torch.Tensor:
        """
        Training forward pass with teacher forcing.
        src: [batch_size, src_len]
        src_lengths: [batch_size]
        trg: [batch_size, trg_len]
        Returns:
            outputs: [batch_size, trg_len, vocab_size]
        """
        batch_size = src.size(0)
        trg_len = trg.size(1)
        outputs = torch.zeros(batch_size, trg_len, self.vocab_size).to(self.device)

        mask = (src != NLPPipeline.PAD_IDX).to(self.device)
        encoder_outputs, hidden = self.encoder(src, src_lengths)

        # First token is always <SOS>
        input_token = trg[:, 0]

        for t in range(1, trg_len):
            prediction, hidden, _ = self.decoder(input_token, hidden, encoder_outputs, mask)
            outputs[:, t, :] = prediction
            
            # Teacher forcing: feed ground truth or model prediction
            teacher_force = torch.rand(1).item() < teacher_forcing_ratio
            top1 = prediction.argmax(1)
            input_token = trg[:, t] if teacher_force else top1

        return outputs

    def beam_search_decode(
        self,
        src_indices: List[int],
        src_len: int,
        beam_width: int = 4,
        max_len: int = 60,
        min_len: int = 10,
        length_penalty_alpha: float = 0.6,
        repetition_penalty: float = 1.3
    ) -> Tuple[List[int], float, List[np.ndarray]]:
        """
        Beam Search Decoding with length penalty and repetition avoidance.
        """
        self.eval()
        with torch.no_grad():
            src_tensor = torch.tensor([src_indices], dtype=torch.long, device=self.device)
            lengths_tensor = torch.tensor([src_len], dtype=torch.long, device=self.device)
            mask = (src_tensor != NLPPipeline.PAD_IDX).to(self.device)

            encoder_outputs, hidden = self.encoder(src_tensor, lengths_tensor)

            # Hypothesis: (score, tokens, hidden, attn_weights_list)
            hypotheses = [(0.0, [NLPPipeline.SOS_IDX], hidden, [])]
            completed_hypotheses = []

            for step in range(max_len):
                candidates = []
                for score, tokens, h, attns in hypotheses:
                    last_token = tokens[-1]
                    if last_token == NLPPipeline.EOS_IDX:
                        completed_hypotheses.append((score, tokens, h, attns))
                        continue

                    inp = torch.tensor([last_token], dtype=torch.long, device=self.device)
                    logits, next_h, attn_w = self.decoder(inp, h, encoder_outputs, mask)

                    # Repetition penalty
                    for t in set(tokens):
                        logits[0, t] /= repetition_penalty

                    log_probs = F.log_softmax(logits, dim=-1).squeeze(0)

                    # Suppress EOS if under minimum length
                    if step < min_len:
                        log_probs[NLPPipeline.EOS_IDX] = -1e9

                    topk_log_probs, topk_indices = torch.topk(log_probs, beam_width)

                    for lp, idx in zip(topk_log_probs.tolist(), topk_indices.tolist()):
                        new_tokens = tokens + [idx]
                        new_score = score + lp
                        candidates.append((new_score, new_tokens, next_h, attns + [attn_w.cpu().numpy()]))

                if not candidates:
                    break

                # Sort by length-penalized score: score / (len^alpha)
                def penalized_score(item):
                    s, toks, _, _ = item
                    lp = ((5 + len(toks)) / 6) ** length_penalty_alpha
                    return s / lp

                candidates = sorted(candidates, key=penalized_score, reverse=True)
                hypotheses = candidates[:beam_width]

                # Stop if all hypotheses ended in EOS
                if all(h[1][-1] == NLPPipeline.EOS_IDX for h in hypotheses):
                    completed_hypotheses.extend(hypotheses)
                    break

            if not completed_hypotheses:
                completed_hypotheses = hypotheses

            def final_score(item):
                s, toks, _, _ = item
                lp = ((5 + len(toks)) / 6) ** length_penalty_alpha
                return s / lp

            best = max(completed_hypotheses, key=final_score)
            best_score, best_tokens, _, best_attns = best

            return best_tokens, best_score, best_attns

    def greedy_decode(
        self,
        src_indices: List[int],
        src_len: int,
        max_len: int = 60
    ) -> Tuple[List[int], List[np.ndarray]]:
        """Greedy argmax decoding for comparison."""
        self.eval()
        with torch.no_grad():
            src_tensor = torch.tensor([src_indices], dtype=torch.long, device=self.device)
            lengths_tensor = torch.tensor([src_len], dtype=torch.long, device=self.device)
            mask = (src_tensor != NLPPipeline.PAD_IDX).to(self.device)

            encoder_outputs, hidden = self.encoder(src_tensor, lengths_tensor)

            tokens = [NLPPipeline.SOS_IDX]
            attns = []

            for _ in range(max_len):
                inp = torch.tensor([tokens[-1]], dtype=torch.long, device=self.device)
                logits, hidden, attn_w = self.decoder(inp, hidden, encoder_outputs, mask)
                next_token = logits.argmax(1).item()
                tokens.append(next_token)
                attns.append(attn_w.cpu().numpy())
                if next_token == NLPPipeline.EOS_IDX:
                    break

            return tokens, attns
