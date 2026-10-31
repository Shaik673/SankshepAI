from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ..models.nlp_pipeline import NLPPipeline
from ..models.qa_service import QAService

router = APIRouter(prefix="/api", tags=["NLP Utilities"])

class PreprocessRequest(BaseModel):
    text: str = Field(..., min_length=1)

class QARequest(BaseModel):
    document_text: str = Field(..., min_length=10)
    question: str = Field(..., min_length=3)

class EntityRequest(BaseModel):
    text: str = Field(..., min_length=1)

@router.post("/preprocess")
def preprocess_text(req: PreprocessRequest):
    """
    NLP preprocessing pipeline: text normalization, sentence segmentation,
    word count, and structure inspection.
    """
    cleaned = NLPPipeline.clean_text(req.text)
    sentences = NLPPipeline.segment_sentences(cleaned)
    words = cleaned.split()

    return {
        "status": "success",
        "cleaned_text": cleaned,
        "sentence_count": len(sentences),
        "word_count": len(words),
        "sentences": sentences[:10], # preview first 10
        "is_truncated_preview": len(sentences) > 10
    }

@router.post("/qa")
def answer_question(req: QARequest):
    """
    Source-grounded Document Question Answering.
    Does not hallucinate: reports when information is absent from source.
    """
    result = QAService.answer_question(req.document_text, req.question)
    return {
        "status": "success",
        **result
    }

@router.post("/extract-entities")
def extract_entities(req: EntityRequest):
    """
    Extract high-precision dates, monetary figures, circular numbers, and organizations.
    """
    entities = QAService.extract_entities(req.text)
    return {
        "status": "success",
        "entities": entities
    }
