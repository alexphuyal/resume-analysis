from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import traceback

from services.text_extractor import extract_text_from_file, clean_text, extract_sections
from services.resume_analyzer import analyzer

router = APIRouter()


@router.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_role: str = Form(...),
    job_description: Optional[str] = Form(None),
    resume_id: Optional[str] = Form(None),
):
    """
    Main endpoint: accept resume file, extract text, run AI analysis.
    Returns structured analysis result.
    """
    # Validate file type
    allowed_types = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if resume.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {resume.content_type}")

    try:
        file_bytes = await resume.read()

        # Extract text
        raw_text = extract_text_from_file(file_bytes, resume.filename)
        cleaned_text = clean_text(raw_text)

        if not cleaned_text or len(cleaned_text) < 50:
            raise HTTPException(status_code=422, detail="Could not extract meaningful text from the resume.")

        # Parse into sections
        sections = extract_sections(cleaned_text)

        # Run analysis
        result = analyzer.analyze(
            text=cleaned_text,
            job_role=job_role,
            job_description=job_description,
            sections=sections,
        )

        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"Analysis error: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/analyze/text")
async def analyze_text(payload: dict):
    """
    Analyze raw text directly (for testing/debugging).
    Body: { "text": "...", "job_role": "...", "job_description": "..." }
    """
    text = payload.get("text", "")
    job_role = payload.get("job_role", "Software Engineer")
    job_description = payload.get("job_description")

    if not text or len(text) < 50:
        raise HTTPException(status_code=400, detail="Text too short")

    sections = extract_sections(text)
    result = analyzer.analyze(text=text, job_role=job_role, job_description=job_description, sections=sections)
    return result
