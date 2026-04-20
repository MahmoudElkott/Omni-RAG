from __future__ import annotations

import pytest

from src.llm.schema import parse_and_validate_payload


def test_parse_valid_mcq_payload() -> None:
    raw = """
    {
      "mode": "mcq",
      "content": {
        "title": "Sample",
        "questions": [
          {
            "id": "q1",
            "question": "What is AI?",
            "options": ["Animal intelligence", "Artificial intelligence", "Art interface", "None"],
            "correct_index": 1,
            "explanation": "AI means artificial intelligence."
          }
        ]
      },
      "metadata": {"difficulty": "adaptive", "tokens_used": 0}
    }
    """

    payload = parse_and_validate_payload(raw, expected_mode="mcq", tokens_used=42)
    assert payload["mode"] == "mcq"
    assert payload["metadata"]["tokens_used"] == 42
    assert len(payload["content"]["questions"]) == 1


def test_invalid_mcq_options_count() -> None:
    raw = """
    {
      "mode": "mcq",
      "content": {
        "questions": [
          {
            "question": "Bad",
            "options": ["A", "B", "C"],
            "correct_index": 1,
            "explanation": "Bad shape"
          }
        ]
      },
      "metadata": {"difficulty": "adaptive", "tokens_used": 0}
    }
    """

    with pytest.raises(ValueError):
        parse_and_validate_payload(raw, expected_mode="mcq")


def test_parse_flashcard_payload() -> None:
    raw = """
    {
      "mode": "flashcard",
      "content": {
        "cards": [
          {"front": "Define API", "back": "Application Programming Interface", "hint": "Acronym"}
        ]
      },
      "metadata": {"difficulty": "adaptive", "tokens_used": 0}
    }
    """

    payload = parse_and_validate_payload(raw, expected_mode="flashcard")
    assert payload["content"]["cards"][0]["front"].startswith("Define")


def test_parse_evaluation_payload_with_fences() -> None:
    raw = """
    ```json
    {
      "mode": "evaluation",
      "content": {
        "question": "Explain entropy",
        "model_answer": "Entropy measures uncertainty.",
        "llm_score": 84,
        "feedback": "Good clarity",
        "strengths": ["Clarity"],
        "improvements": ["Add formula"]
      },
      "metadata": {"difficulty": "adaptive", "tokens_used": 0}
    }
    ```
    """

    payload = parse_and_validate_payload(raw, expected_mode="evaluation")
    assert payload["content"]["llm_score"] == 84
