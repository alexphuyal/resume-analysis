"""
POST /extract — Extract raw text from uploaded resume file.
Used by Node.js API before sending to Gemini.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.text_extractor import extract_text_from_file, clean_text, extract_sections
import traceback

router = APIRouter()

@router.post("/extract")
async def extract_resume_text(resume: UploadFile = File(...)):
    allowed = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if resume.content_type not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported: {resume.content_type}")

    try:
        file_bytes = await resume.read()
        raw_text = extract_text_from_file(file_bytes, resume.filename)
        cleaned = clean_text(raw_text)
        sections = extract_sections(cleaned)
        return {
            "text": cleaned,
            "char_count": len(cleaned),
            "sections": sections,
            "filename": resume.filename,
        }
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))
