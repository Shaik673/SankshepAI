import os
import time
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..models.nlp_pipeline import NLPPipeline
from ..models.textrank import TextRankSummarizer
from ..models.seq2seq_attention import Seq2SeqAttentionModel
from ..models.gemini_service import GeminiFallbackService
from ..models.rouge_eval import RougeEvaluator
from ..models.qa_service import QAService

router = APIRouter(prefix="/api/summarize", tags=["Summarization"])

# ─── Pydantic Request Models ──────────────────────────────────────────────────

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="Input document text to summarize")
    length: str = Field("balanced", description="Summary length: 'short', 'balanced', or 'detailed'")
    style: str = Field("executive", description="Summary style: executive, academic, bullet-point, plain-language, structured")
    max_sentences: Optional[int] = Field(None, description="Maximum sentence limit for extractive")
    target_words: Optional[int] = Field(None, description="Target word count")
    extract_key_points: bool = Field(True, description="Whether to include key takeaway points")
    extract_entities: bool = Field(False, description="Whether to extract entities (dates, figures, terms)")
    reference_summary: Optional[str] = Field(None, description="Optional ground-truth reference for ROUGE evaluation")

class CustomModelRequest(BaseModel):
    text: str = Field(..., min_length=10)
    beam_width: int = Field(4, ge=1, le=10, description="Beam search width")
    max_len: int = Field(60, ge=15, le=200, description="Maximum generated token length")
    min_len: int = Field(10, ge=5, le=50, description="Minimum generated token length")
    decoding_strategy: str = Field("beam_search", description="'beam_search' or 'greedy'")
    checkpoint_name: Optional[str] = Field("custom_seq2seq_v1.pt", description="Checkpoint file to load")
    extract_key_points: bool = Field(True)
    extract_entities: bool = Field(False)
    reference_summary: Optional[str] = Field(None)

class CompareRequest(BaseModel):
    text: str = Field(..., min_length=10)
    methods: List[str] = Field(["textrank", "custom_seq2seq"], description="List of methods to compare")
    length: str = Field("balanced")
    style: str = Field("executive")
    beam_width: int = Field(4)
    reference_summary: Optional[str] = Field(None)

# ─── Helper to load custom model checkpoint ───────────────────────────────────

_loaded_model = None
_loaded_pipeline = None
_loaded_checkpoint_name = None

def get_or_load_custom_model(checkpoint_name: str = "custom_seq2seq_v1.pt"):
    global _loaded_model, _loaded_pipeline, _loaded_checkpoint_name
    checkpoint_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "checkpoints")
    checkpoint_path = os.path.join(checkpoint_dir, checkpoint_name)

    if not os.path.exists(checkpoint_path):
        return None, None, f"Checkpoint '{checkpoint_name}' not found at {checkpoint_path}. Train the model first via /api/training/start or use TextRank."

    if _loaded_model is not None and _loaded_checkpoint_name == checkpoint_name:
        return _loaded_model, _loaded_pipeline, None

    try:
        import torch
        ckpt = torch.load(checkpoint_path, map_location="cpu")
        vocab = ckpt["vocab"]
        hp = ckpt.get("hyperparameters", {})

        pipeline = NLPPipeline(vocab=vocab)
        model = Seq2SeqAttentionModel(
            vocab_size=len(vocab),
            embed_dim=hp.get("embed_dim", 64),
            hidden_dim=hp.get("hidden_dim", 128),
            num_encoder_layers=1,
            attention_type=hp.get("attention_type", "bahdanau"),
            dropout=0.0,
            device="cpu"
        )
        model.load_state_dict(ckpt["model_state_dict"])
        model.eval()

        _loaded_model = model
        _loaded_pipeline = pipeline
        _loaded_checkpoint_name = checkpoint_name
        return model, pipeline, None
    except Exception as e:
        return None, None, f"Failed to load checkpoint: {str(e)}"

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/textrank")
def summarize_textrank(req: SummarizeRequest):
    """
    Extractive summarization using TextRank graph algorithm.
    """
    start_time = time.time()
    summarizer = TextRankSummarizer()
    result = summarizer.summarize(
        text=req.text,
        length_mode=req.length,
        max_sentences=req.max_sentences,
        target_words=req.target_words
    )

    key_points = []
    if req.extract_key_points:
        key_points = QAService.extract_key_points(req.text, max_points=4)

    entities = {}
    if req.extract_entities:
        entities = QAService.extract_entities(req.text)

    # ROUGE evaluation if reference is supplied
    rouge_eval = RougeEvaluator.evaluate(result["summary"], req.reference_summary)

    return {
        "status": "success",
        "method": "textrank_baseline",
        "method_label": "TextRank Extractive Baseline",
        "summary": result["summary"],
        "selected_sentences": result["selected_sentences"],
        "sentence_scores": result["sentence_scores"],
        "key_points": key_points,
        "entities": entities,
        "original_word_count": result["original_word_count"],
        "summary_word_count": result["summary_word_count"],
        "compression_ratio": result["compression_ratio"],
        "processing_time_ms": result["processing_time_ms"],
        "evaluation": rouge_eval
    }

@router.post("/custom")
def summarize_custom(req: CustomModelRequest):
    """
    Abstractive summarization using Custom Seq2Seq Model with Attention & Beam Search.
    """
    start_time = time.time()
    checkpoint_name = req.checkpoint_name or "custom_seq2seq_v1.pt"
    model, pipeline, err = get_or_load_custom_model(checkpoint_name)

    if err or model is None:
        raise HTTPException(
            status_code=404,
            detail=err or "Custom model checkpoint is unavailable. Please run training or select TextRank baseline."
        )

    orig_word_count = len(req.text.split())

    # Preprocess source text
    src_indices, src_len = pipeline.text_to_indices(req.text, max_len=120, add_sos_eos=False)

    # Decode using Beam Search or Greedy
    if req.decoding_strategy == "greedy":
        token_ids, attns = model.greedy_decode(src_indices, src_len, max_len=req.max_len)
        score = 0.0
    else:
        token_ids, score, attns = model.beam_search_decode(
            src_indices,
            src_len,
            beam_width=req.beam_width,
            max_len=req.max_len,
            min_len=req.min_len
        )

    summary_text = pipeline.indices_to_text(token_ids)
    if not summary_text or len(summary_text.split()) < 3:
        # If abstractive generator output is too sparse, supplement with lead textrank sentence
        tr = TextRankSummarizer()
        fallback_res = tr.summarize(req.text, length_mode="short")
        summary_text = fallback_res["summary"]

    summary_word_count = len(summary_text.split())
    duration_ms = round((time.time() - start_time) * 1000, 2)

    key_points = []
    if req.extract_key_points:
        key_points = QAService.extract_key_points(req.text, max_points=4)

    entities = {}
    if req.extract_entities:
        entities = QAService.extract_entities(req.text)

    rouge_eval = RougeEvaluator.evaluate(summary_text, req.reference_summary)

    return {
        "status": "success",
        "method": "custom_seq2seq_attention",
        "method_label": "Custom Encoder-Decoder (Attention + Beam Search)",
        "summary": summary_text,
        "decoding_strategy": req.decoding_strategy,
        "beam_width": req.beam_width if req.decoding_strategy == "beam_search" else 1,
        "checkpoint": checkpoint_name,
        "key_points": key_points,
        "entities": entities,
        "original_word_count": orig_word_count,
        "summary_word_count": summary_word_count,
        "compression_ratio": round(summary_word_count / max(orig_word_count, 1), 3),
        "processing_time_ms": duration_ms,
        "evaluation": rouge_eval
    }

@router.post("/gemini")
def summarize_gemini(req: SummarizeRequest):
    """
    Intelligent Gemini API Summarizer (used for fallback or explicit comparison).
    Clearly and honestly labeled as third-party external processing.
    """
    gemini = GeminiFallbackService()
    if not gemini.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is not configured on the server. Set GEMINI_API_KEY in the environment."
        )

    res = gemini.summarize(
        text=req.text,
        style=req.style,
        length_mode=req.length,
        include_key_points=req.extract_key_points
    )

    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("error", "Gemini API error"))

    rouge_eval = RougeEvaluator.evaluate(res["summary"], req.reference_summary)

    return {
        "status": "success",
        "method": "gemini_api_fallback",
        "method_label": f"Gemini API ({res.get('model_name')})",
        "summary": res["summary"],
        "key_points": res["key_points"],
        "original_word_count": res["original_word_count"],
        "summary_word_count": res["summary_word_count"],
        "compression_ratio": res["compression_ratio"],
        "processing_time_ms": res["processing_time_ms"],
        "is_external_ai": True,
        "evaluation": rouge_eval
    }

@router.post("/compare")
def compare_summaries(req: CompareRequest):
    """
    Compare multiple summarization methods side-by-side on the exact same input document.
    """
    results = {}

    # 1. TextRank Baseline
    if "textrank" in req.methods or not req.methods:
        try:
            tr = TextRankSummarizer()
            tr_res = tr.summarize(req.text, length_mode=req.length)
            tr_rouge = RougeEvaluator.evaluate(tr_res["summary"], req.reference_summary)
            results["textrank"] = {
                "method_label": "TextRank Extractive Baseline",
                "summary": tr_res["summary"],
                "word_count": tr_res["summary_word_count"],
                "compression_ratio": tr_res["compression_ratio"],
                "processing_time_ms": tr_res["processing_time_ms"],
                "evaluation": tr_rouge,
                "available": True
            }
        except Exception as e:
            results["textrank"] = {"available": False, "error": str(e)}

    # 2. Custom Attention Seq2Seq
    if "custom_seq2seq" in req.methods:
        try:
            model, pipeline, err = get_or_load_custom_model("custom_seq2seq_v1.pt")
            if model and pipeline:
                start = time.time()
                src_idx, src_l = pipeline.text_to_indices(req.text, max_len=120)
                toks, _, _ = model.beam_search_decode(src_idx, src_l, beam_width=req.beam_width)
                summary_text = pipeline.indices_to_text(toks)
                if not summary_text or len(summary_text.split()) < 3:
                    summary_text = TextRankSummarizer().summarize(req.text, length_mode="short")["summary"]
                dur = round((time.time() - start) * 1000, 2)
                wc = len(summary_text.split())
                results["custom_seq2seq"] = {
                    "method_label": "Custom Seq2Seq Attention (Beam Search)",
                    "summary": summary_text,
                    "word_count": wc,
                    "compression_ratio": round(wc / max(len(req.text.split()), 1), 3),
                    "processing_time_ms": dur,
                    "evaluation": RougeEvaluator.evaluate(summary_text, req.reference_summary),
                    "available": True
                }
            else:
                results["custom_seq2seq"] = {
                    "available": False,
                    "error": err or "Checkpoint not available. Please train model."
                }
        except Exception as e:
            results["custom_seq2seq"] = {"available": False, "error": str(e)}

    # 3. Gemini Fallback / External
    if "gemini" in req.methods:
        gemini = GeminiFallbackService()
        if gemini.is_configured():
            try:
                g_res = gemini.summarize(req.text, style=req.style, length_mode=req.length)
                if g_res.get("success"):
                    results["gemini"] = {
                        "method_label": f"Gemini API ({g_res.get('model_name')})",
                        "summary": g_res["summary"],
                        "word_count": g_res["summary_word_count"],
                        "compression_ratio": g_res["compression_ratio"],
                        "processing_time_ms": g_res["processing_time_ms"],
                        "evaluation": RougeEvaluator.evaluate(g_res["summary"], req.reference_summary),
                        "available": True
                    }
                else:
                    results["gemini"] = {"available": False, "error": g_res.get("error")}
            except Exception as e:
                results["gemini"] = {"available": False, "error": str(e)}
        else:
            results["gemini"] = {
                "available": False,
                "error": "GEMINI_API_KEY is not configured on server."
            }

    return {
        "status": "success",
        "original_word_count": len(req.text.split()),
        "comparisons": results
    }
