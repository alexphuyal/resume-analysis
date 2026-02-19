"""
Extract raw text from PDF and Word documents.
"""
import pdfplumber
import docx
import io
import re


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Extract plain text from a PDF or Word document."""
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        return _extract_from_pdf(file_bytes)
    elif ext in ("doc", "docx"):
        return _extract_from_docx(file_bytes)
    else:
        raise ValueError(f"Unsupported file format: {ext}")


def _extract_from_pdf(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_from_docx(file_bytes: bytes) -> str:
    doc = docx.Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    return "\n".join(paragraphs)


def clean_text(text: str) -> str:
    """Clean and normalize extracted text."""
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    text = text.strip()
    return text


def extract_sections(text: str) -> dict:
    """Attempt to parse resume into sections."""
    sections = {
        "summary": "",
        "experience": "",
        "education": "",
        "skills": "",
        "projects": "",
        "certifications": "",
    }
    section_headers = {
        "summary": ["summary", "objective", "profile", "about"],
        "experience": ["experience", "work experience", "employment", "work history"],
        "education": ["education", "academic", "qualifications"],
        "skills": ["skills", "technical skills", "competencies", "technologies"],
        "projects": ["projects", "personal projects", "portfolio"],
        "certifications": ["certifications", "certificates", "licenses"],
    }

    lines = text.split('\n')
    current_section = None
    section_content = {k: [] for k in sections}

    for line in lines:
        line_lower = line.lower().strip()
        matched = False
        for section, headers in section_headers.items():
            if any(h in line_lower for h in headers) and len(line_lower) < 40:
                current_section = section
                matched = True
                break
        if not matched and current_section:
            section_content[current_section].append(line)

    for section in sections:
        sections[section] = "\n".join(section_content[section]).strip()

    return sections
