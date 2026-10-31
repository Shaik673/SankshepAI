from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field
from ..models.rouge_eval import RougeEvaluator

router = APIRouter(prefix="/api/evaluate", tags=["Evaluation"])

class RougeRequest(BaseModel):
    hypothesis: str = Field(..., min_length=1, description="Generated summary")
    reference: Optional[str] = Field(None, description="Ground truth reference summary")

@router.post("/rouge")
def evaluate_rouge(req: RougeRequest):
    """
    Evaluate hypothesis against reference using ROUGE-1, ROUGE-2, and ROUGE-L.
    Never fabricates scores when reference is missing.
    """
    result = RougeEvaluator.evaluate(req.hypothesis, req.reference)
    return {
        "status": "success",
        **result
    }
