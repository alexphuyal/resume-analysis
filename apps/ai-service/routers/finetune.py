"""
Fine-tuning router for HuggingFace BERT model on resume scoring dataset.
POST /finetune/start  - Start a fine-tuning job
GET  /finetune/status - Get current training status
POST /finetune/push   - Push fine-tuned model to HuggingFace Hub
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
import threading

router = APIRouter(prefix="/finetune")

# In-memory job tracker
_job_state = {
    "status": "idle",         # idle | running | completed | failed
    "progress": 0,
    "epoch": 0,
    "total_epochs": 0,
    "loss": None,
    "model_path": None,
    "error": None,
    "logs": [],
}
_job_lock = threading.Lock()


class FineTuneRequest(BaseModel):
    base_model: str = "bert-base-uncased"
    num_epochs: int = 3
    batch_size: int = 8
    learning_rate: float = 2e-5
    max_samples: int = 500
    push_to_hub: bool = False
    hub_repo_id: Optional[str] = None


class PushRequest(BaseModel):
    model_path: str
    repo_id: str
    private: bool = True


@router.post("/start")
async def start_finetuning(req: FineTuneRequest, background_tasks: BackgroundTasks):
    """Start fine-tuning the model in the background."""
    with _job_lock:
        if _job_state["status"] == "running":
            raise HTTPException(status_code=409, detail="A fine-tuning job is already running.")
        _job_state.update({
            "status": "running",
            "progress": 0,
            "epoch": 0,
            "total_epochs": req.num_epochs,
            "loss": None,
            "model_path": None,
            "error": None,
            "logs": ["Starting fine-tuning job..."],
        })

    background_tasks.add_task(_run_finetuning, req)
    return {"message": "Fine-tuning started", "status": "running", "config": req.dict()}


@router.get("/status")
async def get_finetune_status():
    """Get the current fine-tuning job status."""
    with _job_lock:
        return dict(_job_state)


@router.post("/push")
async def push_to_hub(req: PushRequest):
    """Push a trained model to HuggingFace Hub."""
    from huggingface_hub import HfApi
    hf_token = os.getenv("HF_TOKEN")
    if not hf_token:
        raise HTTPException(status_code=500, detail="HF_TOKEN not configured")

    try:
        api = HfApi(token=hf_token)
        api.upload_folder(
            folder_path=req.model_path,
            repo_id=req.repo_id,
            repo_type="model",
            private=req.private,
        )
        return {"message": f"Model pushed to {req.repo_id}", "url": f"https://huggingface.co/{req.repo_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _log(msg: str):
    print(msg)
    with _job_lock:
        _job_state["logs"].append(msg)


def _run_finetuning(req: FineTuneRequest):
    """
    Background thread: fine-tune BERT on a synthetic resume scoring dataset.
    Uses HuggingFace Trainer API.
    """
    try:
        import torch
        from transformers import (
            AutoTokenizer, AutoModelForSequenceClassification,
            TrainingArguments, Trainer, DataCollatorWithPadding,
        )
        from datasets import Dataset
        import numpy as np

        _log(f"Loading base model: {req.base_model}")
        hf_token = os.getenv("HF_TOKEN")

        tokenizer = AutoTokenizer.from_pretrained(req.base_model, token=hf_token or None)
        model = AutoModelForSequenceClassification.from_pretrained(
            req.base_model, num_labels=1, token=hf_token or None
        )

        _log("Building training dataset...")
        dataset = _build_dataset(req.max_samples)

        def tokenize(batch):
            return tokenizer(batch["text"], truncation=True, max_length=512, padding=False)

        tokenized = dataset.map(tokenize, batched=True, remove_columns=["text"])
        split = tokenized.train_test_split(test_size=0.1, seed=42)
        train_ds = split["train"]
        eval_ds = split["test"]

        _log(f"Dataset: {len(train_ds)} train, {len(eval_ds)} eval samples")

        output_dir = os.path.join(os.path.dirname(__file__), "..", "models", "finetuned-resume-bert")
        os.makedirs(output_dir, exist_ok=True)

        def compute_metrics(eval_pred):
            preds, labels = eval_pred
            preds = preds.squeeze()
            mse = float(np.mean((preds - labels) ** 2))
            mae = float(np.mean(np.abs(preds - labels)))
            return {"mse": mse, "mae": mae}

        class ProgressCallback:
            def on_epoch_end(self, args, state, control, **kwargs):
                epoch = int(state.epoch)
                progress = int((epoch / req.num_epochs) * 100)
                loss = state.log_history[-1].get("loss") if state.log_history else None
                with _job_lock:
                    _job_state["epoch"] = epoch
                    _job_state["progress"] = progress
                    _job_state["loss"] = loss
                _log(f"Epoch {epoch}/{req.num_epochs} — loss: {loss:.4f}" if loss else f"Epoch {epoch}/{req.num_epochs}")

        from transformers import TrainerCallback
        class JobCallback(TrainerCallback):
            def on_epoch_end(self, args, state, control, **kwargs):
                ProgressCallback().on_epoch_end(args, state, control, **kwargs)

        training_args = TrainingArguments(
            output_dir=output_dir,
            num_train_epochs=req.num_epochs,
            per_device_train_batch_size=req.batch_size,
            per_device_eval_batch_size=req.batch_size,
            learning_rate=req.learning_rate,
            evaluation_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="mse",
            greater_is_better=False,
            warmup_ratio=0.1,
            weight_decay=0.01,
            logging_steps=10,
            report_to="none",
            fp16=torch.cuda.is_available(),
        )

        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_ds,
            eval_dataset=eval_ds,
            tokenizer=tokenizer,
            data_collator=data_collator,
            compute_metrics=compute_metrics,
            callbacks=[JobCallback()],
        )

        _log("Training started...")
        trainer.train()
        _log("Training complete. Saving model...")

        trainer.save_model(output_dir)
        tokenizer.save_pretrained(output_dir)

        # Optionally push to Hub
        if req.push_to_hub and req.hub_repo_id:
            _log(f"Pushing to HuggingFace Hub: {req.hub_repo_id}")
            trainer.push_to_hub(req.hub_repo_id, token=os.getenv("HF_TOKEN"))
            _log(f"Model pushed to https://huggingface.co/{req.hub_repo_id}")

        with _job_lock:
            _job_state["status"] = "completed"
            _job_state["progress"] = 100
            _job_state["model_path"] = output_dir
        _log(f"Fine-tuning completed! Model saved to {output_dir}")

    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        _log(f"Error: {error_msg}")
        with _job_lock:
            _job_state["status"] = "failed"
            _job_state["error"] = str(e)


def _build_dataset(max_samples: int = 500) -> Dataset:
    """
    Build a synthetic training dataset of (resume_text, score) pairs.
    In production you would load real labeled data here.
    """
    import random
    random.seed(42)

    skills_pool = [
        "Python", "JavaScript", "React", "Node.js", "TypeScript", "Docker", "Kubernetes",
        "AWS", "SQL", "PostgreSQL", "Git", "CI/CD", "GraphQL", "Redis", "Microservices",
        "Machine Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn",
    ]
    companies = ["Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix", "Spotify",
                 "Stripe", "Airbnb", "Uber", "LinkedIn", "Twitter", "Salesforce"]
    roles = ["Software Engineer", "Senior Engineer", "Staff Engineer", "Tech Lead",
             "Backend Developer", "Full Stack Developer", "Data Scientist"]
    verbs = ["Developed", "Architected", "Led", "Launched", "Built", "Reduced", "Increased",
             "Improved", "Implemented", "Designed", "Created", "Delivered", "Optimized"]

    records = []
    for _ in range(max_samples):
        n_skills = random.randint(3, 12)
        skills = random.sample(skills_pool, n_skills)
        has_metrics = random.random() > 0.4
        n_companies = random.randint(1, 4)
        years = random.randint(1, 15)

        bullets = []
        for i in range(random.randint(4, 10)):
            verb = random.choice(verbs)
            skill = random.choice(skills)
            if has_metrics:
                metric = random.choice([f"by {random.randint(10,80)}%",
                                        f"for {random.randint(10,1000)} users",
                                        f"saving ${random.randint(10,500)}K annually"])
                bullets.append(f"{verb} {skill} system {metric}")
            else:
                bullets.append(f"Worked on {skill} related tasks")

        text = f"""
        John Doe | john.doe@email.com | LinkedIn | GitHub
        SUMMARY
        {years}+ years of experience as a {random.choice(roles)}. Skilled in {', '.join(skills[:5])}.
        EXPERIENCE
        {random.choice(companies)} — {random.choice(roles)} ({years - random.randint(0,2)} yrs)
        {chr(10).join('• ' + b for b in bullets)}
        EDUCATION
        B.S. Computer Science, State University
        SKILLS
        {', '.join(skills)}
        """.strip()

        # Score heuristic
        score = 40
        score += min(n_skills * 3, 30)
        score += 15 if has_metrics else 0
        score += min(n_companies * 5, 15)
        score = min(max(score + random.randint(-5, 5), 20), 100) / 100.0

        records.append({"text": text, "label": score})

    return Dataset.from_list(records)
