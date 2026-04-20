from __future__ import annotations

from src.llm.prompting import build_generation_prompt


def test_mcq_generation_prompt_renders_json_schema() -> None:
    prompt = build_generation_prompt(
        mode="mcq",
        source_text="Sample content",
        language="English",
        count=5,
        user_instruction="",
    )

    assert "Create exactly 5 multiple-choice questions." in prompt
    assert '"title": "string"' in prompt
    assert '"questions": [' in prompt


def test_flashcard_generation_prompt_renders_json_schema() -> None:
    prompt = build_generation_prompt(
        mode="flashcard",
        source_text="Sample content",
        language="English",
        count=7,
        user_instruction="",
    )

    assert "Create exactly 7 flashcards." in prompt
    assert '"deck_title": "string"' in prompt
    assert '"cards": [' in prompt
