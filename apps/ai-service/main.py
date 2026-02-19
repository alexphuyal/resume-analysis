from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()

from routers import analyze, finetune, health, extract

app = FastAPI(
    title="Resume Analysis AI Service",
    description="Text extraction + AI model service for ResumeAI",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(extract.router, tags=["Extract"])
app.include_router(analyze.router, tags=["Analysis"])
app.include_router(finetune.router, tags=["Fine-tuning"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
