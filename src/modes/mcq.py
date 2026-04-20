from __future__ import annotations

from typing import Any


def normalize_mcq_payload(payload: dict[str, Any]) -> dict[str, Any]:
    questions = payload.get("content", {}).get("questions", [])
    for idx, question in enumerate(questions, start=1):
        question.setdefault("id", f"mcq-{idx}")
    return payload


def is_correct_answer(question: dict[str, Any], selected_index: int) -> bool:
    return int(question.get("correct_index", -1)) == int(selected_index)


def to_failed_mcq_item(question: dict[str, Any], selected_index: int) -> dict[str, Any]:
    return {
        "type": "mcq",
        "id": str(question.get("id")),
        "question": question.get("question", ""),
        "options": question.get("options", []),
        "correct_index": int(question.get("correct_index", 0)),
        "selected_index": int(selected_index),
        "explanation": question.get("explanation", ""),
    }
