from __future__ import annotations

import json
import re
from typing import Any, Literal

from pydantic import BaseModel, Field, ValidationError

ModeName = Literal["mcq", "flashcard", "evaluation"]


class Metadata(BaseModel):
    difficulty: str = "adaptive"
    tokens_used: int = 0


class LearningPayload(BaseModel):
    mode: ModeName
    content: dict[str, Any] = Field(default_factory=dict)
    metadata: Metadata = Field(default_factory=Metadata)


def _strip_code_fences(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```[a-zA-Z0-9_-]*", "", stripped).strip()
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()
    return stripped


def _extract_json_candidate(text: str) -> str:
    cleaned = _strip_code_fences(text)
    if cleaned.startswith("{") and cleaned.endswith("}"):
        return cleaned

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No JSON object detected in model output.")
    return cleaned[start : end + 1]


def _validate_mcq_content(content: dict[str, Any]) -> dict[str, Any]:
    questions = content.get("questions")
    if not isinstance(questions, list) or not questions:
        raise ValueError("MCQ content must contain a non-empty 'questions' list.")

    normalized_questions: list[dict[str, Any]] = []
    for index, question in enumerate(questions, start=1):
        if not isinstance(question, dict):
            raise ValueError(f"Question at position {index} must be an object.")

        prompt = str(question.get("question", "")).strip()
        options = question.get("options", [])
        explanation = str(question.get("explanation", "")).strip()
        correct_index = question.get("correct_index")

        if not prompt:
            raise ValueError(f"Question {index} is missing 'question' text.")
        if not isinstance(options, list) or len(options) != 4:
            raise ValueError(f"Question {index} must have exactly 4 options.")
        if not isinstance(correct_index, int) or not 0 <= correct_index <= 3:
            raise ValueError(f"Question {index} must have 'correct_index' between 0 and 3.")
        if not explanation:
            raise ValueError(f"Question {index} is missing an explanation.")

        normalized_questions.append(
            {
                "id": str(question.get("id") or f"mcq-{index}"),
                "question": prompt,
                "options": [str(option).strip() for option in options],
                "correct_index": correct_index,
                "explanation": explanation,
                "difficulty": str(question.get("difficulty", "adaptive")),
            }
        )

    content["questions"] = normalized_questions
    content.setdefault("title", "Practice Quiz")
    return content


def _validate_flashcard_content(content: dict[str, Any]) -> dict[str, Any]:
    cards = content.get("cards")
    if not isinstance(cards, list) or not cards:
        raise ValueError("Flashcard content must contain a non-empty 'cards' list.")

    normalized_cards: list[dict[str, Any]] = []
    for index, card in enumerate(cards, start=1):
        if not isinstance(card, dict):
            raise ValueError(f"Card at position {index} must be an object.")

        front = str(card.get("front", "")).strip()
        back = str(card.get("back", "")).strip()
        if not front or not back:
            raise ValueError(f"Card {index} must contain both 'front' and 'back'.")

        normalized_cards.append(
            {
                "id": str(card.get("id") or f"card-{index}"),
                "front": front,
                "back": back,
                "hint": str(card.get("hint", "")).strip(),
            }
        )

    content["cards"] = normalized_cards
    content.setdefault("deck_title", "Flashcard Deck")
    return content


def _validate_evaluation_content(content: dict[str, Any]) -> dict[str, Any]:
    question = str(content.get("question", "")).strip()
    model_answer = str(content.get("model_answer", "")).strip()
    feedback = str(content.get("feedback", "")).strip()

    llm_score_raw = content.get("llm_score", 0)
    if isinstance(llm_score_raw, str) and llm_score_raw.isdigit():
        llm_score = int(llm_score_raw)
    elif isinstance(llm_score_raw, (int, float)):
        llm_score = int(round(float(llm_score_raw)))
    else:
        llm_score = 0

    content["llm_score"] = max(0, min(100, llm_score))
    content["question"] = question
    content["model_answer"] = model_answer
    content["feedback"] = feedback

    strengths = content.get("strengths", [])
    improvements = content.get("improvements", [])

    content["strengths"] = [str(item).strip() for item in strengths if str(item).strip()] if isinstance(strengths, list) else []
    content["improvements"] = [str(item).strip() for item in improvements if str(item).strip()] if isinstance(improvements, list) else []

    return content


def validate_mode_content(mode: ModeName, content: dict[str, Any]) -> dict[str, Any]:
    if mode == "mcq":
        return _validate_mcq_content(content)
    if mode == "flashcard":
        return _validate_flashcard_content(content)
    return _validate_evaluation_content(content)


def parse_and_validate_payload(raw_text: str, expected_mode: ModeName | None = None, tokens_used: int = 0) -> dict[str, Any]:
    try:
        candidate = _extract_json_candidate(raw_text)
        data = json.loads(candidate)
        payload = LearningPayload.model_validate(data)
    except (json.JSONDecodeError, ValidationError, ValueError) as exc:
        raise ValueError(f"Invalid structured output: {exc}") from exc

    if expected_mode and payload.mode != expected_mode:
        raise ValueError(f"Expected mode '{expected_mode}' but got '{payload.mode}'.")

    payload.content = validate_mode_content(payload.mode, payload.content)
    payload.metadata.tokens_used = max(payload.metadata.tokens_used, tokens_used)

    return payload.model_dump()


def build_repair_message(expected_mode: ModeName, error_message: str) -> str:
    return (
        "Your previous response was invalid JSON or did not match schema. "
        f"Return ONLY valid JSON for mode '{expected_mode}'. "
        f"Error details: {error_message}. "
        "Do not add markdown, notes, or surrounding text."
    )
