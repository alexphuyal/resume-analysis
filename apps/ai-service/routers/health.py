from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "resume-analysis-ai",
        "model": os.getenv("FINETUNED_MODEL_NAME", "resume-analysis-bert"),
        "version": "1.0.0"
    }

@router.get("/")
async def root():
    return {"message": "Resume Analysis AI Service", "docs": "/docs"}
