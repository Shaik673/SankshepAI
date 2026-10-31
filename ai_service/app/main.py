import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from .routers import summarize, evaluate, training, experiments, nlp, model, rag

app = FastAPI(
    title="SankshepAI NLP & Deep Learning Service",
    description="Academically rigorous NLP service powering SankshepAI with TextRank baseline, Custom Seq2Seq Attention model, Beam Search decoding, ROUGE evaluation, and Gemini fallback orchestration.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(summarize.router)
app.include_router(evaluate.router)
app.include_router(training.router)
app.include_router(experiments.router)
app.include_router(nlp.router)
app.include_router(model.router)
app.include_router(rag.router)

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for container probes and Express backend verification."""
    return {
        "status": "ok",
        "service": "SankshepAI NLP & Deep Learning Service",
        "version": "1.0.0",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to SankshepAI NLP & Deep Learning Service",
        "documentation": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
