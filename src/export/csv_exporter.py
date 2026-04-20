from __future__ import annotations

import csv
import io
from typing import Any


def _mcq_to_csv(content: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "question", "option_a", "option_b", "option_c", "option_d", "correct_index", "explanation"])

    for question in content.get("questions", []):
        options = question.get("options", [])
        padded_options = list(options) + ["", "", "", ""]
        writer.writerow(
            [
                question.get("id", ""),
                question.get("question", ""),
                padded_options[0],
                padded_options[1],
                padded_options[2],
                padded_options[3],
                question.get("correct_index", ""),
                question.get("explanation", ""),
            ]
        )

    return output.getvalue()


def _flashcards_to_csv(content: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "front", "back", "hint"])

    for card in content.get("cards", []):
        writer.writerow([card.get("id", ""), card.get("front", ""), card.get("back", ""), card.get("hint", "")])

    return output.getvalue()


def _evaluation_to_csv(content: dict[str, Any]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["field", "value"])

    for field in [
        "question",
        "model_answer",
        "user_answer",
        "semantic_score",
        "llm_score",
        "match_percentage",
        "feedback",
    ]:
        writer.writerow([field, content.get(field, "")])

    if content.get("strengths"):
        writer.writerow(["strengths", " | ".join(content["strengths"])])
    if content.get("improvements"):
        writer.writerow(["improvements", " | ".join(content["improvements"])])

    return output.getvalue()


def to_csv_bytes(mode: str, payload: dict[str, Any]) -> bytes:
    content = payload.get("content", {})

    if mode == "mcq":
        csv_text = _mcq_to_csv(content)
    elif mode == "flashcard":
        csv_text = _flashcards_to_csv(content)
    else:
        csv_text = _evaluation_to_csv(content)

    return csv_text.encode("utf-8-sig")
