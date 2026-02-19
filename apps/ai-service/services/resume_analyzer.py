"""
Core resume analysis logic using fine-tuned BERT model + heuristics.
"""
import os
import re
import json
import math
import nltk
from typing import Optional
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import torch

# Download NLTK data on first use
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)

MODEL_PATH = os.getenv("FINETUNED_MODEL_NAME", "bert-base-uncased")
HF_TOKEN = os.getenv("HF_TOKEN", "")

# ── Skill banks by job role ────────────────────────────────────────────────────
ROLE_SKILLS = {
    "software engineer": {
        "core": ["python", "java", "c++", "javascript", "typescript", "git", "sql", "docker", "linux", "algorithms"],
        "advanced": ["kubernetes", "graphql", "system design", "ci/cd", "microservices", "aws", "redis", "kafka"],
    },
    "frontend developer": {
        "core": ["react", "html", "css", "javascript", "typescript", "git", "responsive design", "tailwind"],
        "advanced": ["next.js", "vue", "webpack", "testing", "accessibility", "performance optimization"],
    },
    "backend developer": {
        "core": ["node.js", "python", "java", "sql", "rest api", "git", "docker", "postgresql"],
        "advanced": ["microservices", "kafka", "redis", "kubernetes", "graphql", "system design"],
    },
    "data scientist": {
        "core": ["python", "machine learning", "pandas", "numpy", "scikit-learn", "statistics", "sql", "jupyter"],
        "advanced": ["deep learning", "tensorflow", "pytorch", "nlp", "mlops", "feature engineering", "a/b testing"],
    },
    "ml engineer": {
        "core": ["python", "pytorch", "tensorflow", "scikit-learn", "git", "docker", "sql", "linux"],
        "advanced": ["mlops", "kubernetes", "distributed training", "model serving", "huggingface", "cuda"],
    },
    "devops engineer": {
        "core": ["docker", "kubernetes", "ci/cd", "linux", "git", "aws", "terraform", "bash"],
        "advanced": ["ansible", "monitoring", "elk stack", "service mesh", "security", "cost optimization"],
    },
    "product manager": {
        "core": ["product strategy", "roadmap", "agile", "scrum", "stakeholder", "metrics", "user research"],
        "advanced": ["data analysis", "sql", "a/b testing", "okrs", "go-to-market", "pricing strategy"],
    },
    "full stack developer": {
        "core": ["react", "node.js", "javascript", "typescript", "sql", "rest api", "git", "docker"],
        "advanced": ["next.js", "graphql", "redis", "ci/cd", "aws", "microservices", "testing"],
    },
}

# Action verbs that indicate strong impact
IMPACT_VERBS = {
    "strong": ["developed", "architected", "led", "launched", "built", "reduced", "increased",
               "improved", "implemented", "designed", "created", "established", "delivered",
               "optimized", "automated", "scaled", "transformed", "spearheaded", "drove"],
    "weak": ["worked on", "helped", "assisted", "participated", "involved", "responsible for",
             "duties included", "was part of"],
}

# Quantification patterns
QUANT_PATTERN = re.compile(r'\d+%|\$\d+|\d+x|\d+\+|\d+ (users|customers|engineers|teams|services|apis|features)', re.I)


class ResumeAnalyzer:
    """
    Analyzes a resume using both heuristics and a fine-tuned BERT model.
    Falls back to heuristic scoring if the model is unavailable.
    """

    def __init__(self):
        self.model = None
        self.tokenizer = None
        self._try_load_model()

    def _try_load_model(self):
        """Attempt to load the fine-tuned model; gracefully degrade if unavailable."""
        try:
            model_name = os.getenv("FINETUNED_MODEL_NAME", "bert-base-uncased")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name, token=HF_TOKEN or None)
            self.model = AutoModelForSequenceClassification.from_pretrained(
                model_name, token=HF_TOKEN or None, num_labels=1
            )
            self.model.eval()
            print(f"✅ Loaded model: {model_name}")
        except Exception as e:
            print(f"⚠️  Model load failed ({e}), using heuristic scoring.")
            self.model = None
            self.tokenizer = None

    def analyze(
        self,
        text: str,
        job_role: str,
        job_description: Optional[str] = None,
        sections: Optional[dict] = None,
    ) -> dict:
        """Run full analysis pipeline on extracted resume text."""
        text_lower = text.lower()
        role_key = self._normalize_role(job_role)
        role_skills = ROLE_SKILLS.get(role_key, ROLE_SKILLS["software engineer"])

        scores = {
            "ats": self._score_ats(text),
            "content": self._score_content(text, sections or {}),
            "keyword": self._score_keywords(text_lower, job_description, role_skills),
            "format": self._score_format(text),
            "impact": self._score_impact(text),
            "readability": self._score_readability(text),
            "skills": self._score_skills(text_lower, role_skills),
            "experience": self._score_experience(text),
        }

        # If model available, blend its score into overall
        if self.model and self.tokenizer:
            model_score = self._get_model_score(text[:512], job_role)
            overall = int(0.6 * model_score + 0.4 * self._weighted_average(scores))
        else:
            overall = self._weighted_average(scores)

        skills_found, skills_missing = self._extract_skills(text_lower, role_skills)
        keywords_matched, keywords_missing = self._extract_keywords(text_lower, job_description, role_key)
        suggestions = self._generate_suggestions(text, text_lower, scores, skills_missing, keywords_missing, job_role)

        return {
            "overall_score": min(max(overall, 0), 100),
            "ats_score": scores["ats"],
            "content_score": scores["content"],
            "keyword_score": scores["keyword"],
            "format_score": scores["format"],
            "impact_score": scores["impact"],
            "readability_score": scores["readability"],
            "skills_score": scores["skills"],
            "experience_score": scores["experience"],
            "model_used": os.getenv("FINETUNED_MODEL_NAME", "heuristic"),
            "summary": self._generate_summary(overall, scores, job_role),
            "skills": {"found": skills_found, "missing": skills_missing},
            "keywords": {"matched": keywords_matched, "missing": keywords_missing},
            "suggestions": suggestions,
            "raw_text": text[:2000],
        }

    # ── Scoring methods ────────────────────────────────────────────────────────

    def _score_ats(self, text: str) -> int:
        """Score ATS compatibility: no tables, images, consistent formatting."""
        score = 100
        # Check for common ATS issues
        if len(re.findall(r'[│┃|]{3,}', text)) > 2:
            score -= 15  # likely table
        if re.search(r'[^\x00-\x7F]{5,}', text):
            score -= 10  # special chars
        sections_found = sum(1 for h in ['experience', 'education', 'skills', 'summary']
                             if h in text.lower())
        score -= (4 - sections_found) * 8
        word_count = len(text.split())
        if word_count < 200:
            score -= 20
        elif word_count > 1000:
            score -= 5
        return min(max(score, 20), 100)

    def _score_content(self, text: str, sections: dict) -> int:
        score = 50
        word_count = len(text.split())
        if 300 <= word_count <= 700:
            score += 20
        elif 200 <= word_count < 300:
            score += 10
        if sections.get("summary"): score += 10
        if sections.get("experience"): score += 10
        if sections.get("education"): score += 5
        if sections.get("skills"): score += 5
        return min(score, 100)

    def _score_keywords(self, text_lower: str, job_desc: Optional[str], role_skills: dict) -> int:
        all_skills = role_skills["core"] + role_skills["advanced"]
        found = sum(1 for s in all_skills if s in text_lower)
        base = int((found / len(all_skills)) * 80) + 20

        if job_desc:
            jd_words = set(re.findall(r'\b\w{4,}\b', job_desc.lower()))
            resume_words = set(re.findall(r'\b\w{4,}\b', text_lower))
            overlap = len(jd_words & resume_words) / max(len(jd_words), 1)
            base = int(base * 0.5 + overlap * 100 * 0.5)

        return min(max(base, 20), 100)

    def _score_format(self, text: str) -> int:
        score = 70
        lines = [l for l in text.split('\n') if l.strip()]
        if len(lines) > 10: score += 10
        # Check for email
        if re.search(r'[\w.+-]+@[\w-]+\.\w+', text): score += 8
        # Check for phone
        if re.search(r'[\+\(]?\d[\d\s\-\(\)]{8,}\d', text): score += 7
        # Check for LinkedIn/GitHub
        if re.search(r'linkedin|github', text, re.I): score += 5
        return min(score, 100)

    def _score_impact(self, text: str) -> int:
        text_lower = text.lower()
        score = 30
        # Strong action verbs
        strong_count = sum(1 for v in IMPACT_VERBS["strong"] if v in text_lower)
        weak_count = sum(1 for v in IMPACT_VERBS["weak"] if v in text_lower)
        # Quantification
        quant_count = len(QUANT_PATTERN.findall(text))
        score += min(strong_count * 5, 35)
        score -= min(weak_count * 5, 20)
        score += min(quant_count * 8, 35)
        return min(max(score, 10), 100)

    def _score_readability(self, text: str) -> int:
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return 50
        avg_len = sum(len(s.split()) for s in sentences) / len(sentences)
        if 10 <= avg_len <= 20:
            return 88
        elif 8 <= avg_len < 10 or 20 < avg_len <= 25:
            return 72
        elif avg_len < 8:
            return 65
        else:
            return 60

    def _score_skills(self, text_lower: str, role_skills: dict) -> int:
        core_found = sum(1 for s in role_skills["core"] if s in text_lower)
        adv_found = sum(1 for s in role_skills["advanced"] if s in text_lower)
        core_score = (core_found / len(role_skills["core"])) * 70
        adv_score = (adv_found / len(role_skills["advanced"])) * 30
        return min(max(int(core_score + adv_score), 20), 100)

    def _score_experience(self, text: str) -> int:
        score = 50
        # Look for years of experience mentions
        years = re.findall(r'(\d+)\+?\s*year', text, re.I)
        if years:
            yr = max(int(y) for y in years)
            score += min(yr * 5, 30)
        # Look for company names / job titles
        job_indicators = len(re.findall(r'\b(engineer|developer|analyst|manager|lead|senior|junior|intern)\b', text, re.I))
        score += min(job_indicators * 3, 20)
        return min(score, 100)

    def _get_model_score(self, text: str, job_role: str) -> int:
        """Get score from fine-tuned model."""
        try:
            inputs = self.tokenizer(
                f"Job: {job_role}. Resume: {text}",
                return_tensors="pt", truncation=True, max_length=512
            )
            with torch.no_grad():
                output = self.model(**inputs)
            logit = output.logits[0][0].item()
            # Map logit to 0-100 range (sigmoid scaled)
            score = int(1 / (1 + math.exp(-logit)) * 100)
            return min(max(score, 10), 100)
        except Exception as e:
            print(f"Model inference error: {e}")
            return 70

    def _weighted_average(self, scores: dict) -> int:
        weights = {
            "ats": 0.20,
            "content": 0.15,
            "keyword": 0.20,
            "format": 0.10,
            "impact": 0.15,
            "readability": 0.05,
            "skills": 0.10,
            "experience": 0.05,
        }
        total = sum(scores[k] * weights[k] for k in weights)
        return int(total)

    # ── Extraction helpers ─────────────────────────────────────────────────────

    def _extract_skills(self, text_lower: str, role_skills: dict):
        all_skills = role_skills["core"] + role_skills["advanced"]
        found = [s for s in all_skills if s in text_lower]
        missing = [s for s in all_skills if s not in text_lower]
        return [s.title() for s in found[:12]], [s.title() for s in missing[:6]]

    def _extract_keywords(self, text_lower: str, job_desc: Optional[str], role_key: str):
        role_skills = ROLE_SKILLS.get(role_key, ROLE_SKILLS["software engineer"])
        all_keywords = [s.lower() for s in role_skills["core"] + role_skills["advanced"]]
        matched = [k for k in all_keywords if k in text_lower][:8]
        missing = [k for k in all_keywords if k not in text_lower][:6]
        return matched, missing

    def _generate_suggestions(self, text, text_lower, scores, skills_missing, keywords_missing, job_role):
        suggestions = []
        if scores["impact"] < 70:
            suggestions.append({"type": "critical", "text": "Add quantified achievements — use metrics like %, $, or x to show impact"})
        if skills_missing:
            top_missing = ", ".join(skills_missing[:3])
            suggestions.append({"type": "critical", "text": f"Add missing key skills: {top_missing} — highly demanded for {job_role}"})
        if scores["keyword"] < 70:
            suggestions.append({"type": "critical", "text": "Your resume lacks critical ATS keywords. Add role-specific terminology"})
        if not re.search(r'linkedin|github', text_lower):
            suggestions.append({"type": "warning", "text": "Add LinkedIn and GitHub profile links to your header"})
        if scores["content"] < 70:
            suggestions.append({"type": "warning", "text": "Expand your professional summary with stronger opening statement"})
        if not re.search(r'[\w.+-]+@[\w-]+\.\w+', text):
            suggestions.append({"type": "warning", "text": "Ensure your email address is clearly visible in the header"})
        if keywords_missing:
            suggestions.append({"type": "info", "text": f"Consider adding keywords: {', '.join(keywords_missing[:3])}"})
        if scores["format"] < 75:
            suggestions.append({"type": "info", "text": "Improve resume structure — add clear section headers"})
        suggestions.append({"type": "info", "text": "Use consistent bullet point formatting across all experience entries"})
        return suggestions[:8]

    def _generate_summary(self, overall, scores, job_role):
        level = "excellent" if overall >= 80 else "good" if overall >= 65 else "needs improvement"
        weak_areas = [k for k, v in scores.items() if v < 65]
        if weak_areas:
            weak_str = ", ".join(weak_areas[:2])
            return (f"Your resume scores {overall}/100 for {job_role} — {level}. "
                    f"Key areas to improve: {weak_str}. "
                    f"Focus on adding quantified achievements and optimizing keywords for better ATS pass rates.")
        return (f"Your resume scores {overall}/100 for {job_role} — {level}. "
                f"Strong overall profile with solid technical content. "
                f"Minor improvements in impact statements could push your score higher.")

    def _normalize_role(self, role: str) -> str:
        role_lower = role.lower()
        for key in ROLE_SKILLS:
            if key in role_lower or role_lower in key:
                return key
        # Fuzzy match
        for key in ROLE_SKILLS:
            for word in key.split():
                if word in role_lower:
                    return key
        return "software engineer"


# Singleton instance
analyzer = ResumeAnalyzer()
