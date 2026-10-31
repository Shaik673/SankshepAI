from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..services.rag_service import DomainRestrictedRAGService, DocumentChunk

router = APIRouter(prefix="/api/rag", tags=["Domain-Restricted RAG"])

_rag_service = DomainRestrictedRAGService()

class SingleDocumentRAGRequest(BaseModel):
    query: str = Field(..., min_length=3, description="User question about the document")
    document_id: str = Field(..., description="Document identifier")
    document_title: str = Field(..., description="Document title")
    document_text: str = Field(..., min_length=10, description="Full text of the document")
    top_k: int = Field(3, ge=1, le=10, description="Number of relevant chunks to retrieve")

class DocumentItem(BaseModel):
    id: str
    title: str
    text: str

class CorpusRAGRequest(BaseModel):
    query: str = Field(..., min_length=3, description="User question across indexed corpus")
    documents: List[DocumentItem] = Field(..., min_length=1, description="List of user's authorized documents")
    top_k: int = Field(4, ge=1, le=10)

class ValidateDomainRequest(BaseModel):
    query: str = Field(..., min_length=2)


@router.post("/query")
def query_document(req: SingleDocumentRAGRequest):
    """
    Execute Domain-Restricted RAG on a single document.
    Enforces domain restrictions, citation generation, and strict abstention.
    """
    result = _rag_service.answer_query(
        query=req.query,
        document_id=req.document_id,
        document_title=req.document_title,
        document_text=req.document_text,
        top_k=req.top_k
    )
    return result


@router.post("/corpus-query")
def query_corpus(req: CorpusRAGRequest):
    """
    Execute Domain-Restricted RAG across multiple user-authorized documents.
    """
    # Chunk all documents
    all_chunks: List[DocumentChunk] = []
    for doc in req.documents:
        chunks = _rag_service.chunk_document(doc.id, doc.title, doc.text)
        all_chunks.extend(chunks)

    if not all_chunks:
        return {
            "success": True,
            "answer": "No indexed content is available to query.",
            "citations": [],
            "domain_verified": True,
            "is_domain_rejected": False,
            "is_insufficient_evidence": True,
            "confidence": 0.0
        }

    # Aggregate full text for query answering
    combined_corpus_text = "\n\n".join([f"=== {doc.title} ===\n{doc.text}" for doc in req.documents])
    result = _rag_service.answer_query(
        query=req.query,
        document_id="multi_corpus",
        document_title="Indexed Knowledge Base",
        document_text=combined_corpus_text,
        top_k=req.top_k
    )
    return result


@router.post("/validate-domain")
def validate_domain(req: ValidateDomainRequest):
    """
    Validate if a given query satisfies domain constraints.
    """
    is_valid, reason = _rag_service.validate_domain_intent(req.query)
    return {
        "is_valid": is_valid,
        "reason": reason
    }

