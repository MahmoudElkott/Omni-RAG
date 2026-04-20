from __future__ import annotations

from textwrap import dedent

from .schema import ModeName

MASTER_SYSTEM_PROMPT = dedent(
    """
    You are a Unified Learning Agent.
    You must ALWAYS return strict JSON and nothing else.

    Required top-level schema:
    {
      "mode": "mcq | flashcard | evaluation",
      "content": { ... },
      "metadata": {
        "difficulty": "adaptive",
        "tokens_used": 0
      }
    }

    Hard rules:
    1) Return valid JSON only (no markdown, no prose, no code fences).
    2) Follow the exact mode requested by the user.
    3) Keep output educationally precise and concise.
    4) Prefer the language requested by the user.
    5) For Arabic outputs, produce natural Modern Standard Arabic.
    """
).strip()


def _language_clause(language: str) -> str:
    normalized = language.strip().lower()
    if normalized == "arabic":
        return "Respond in Arabic and keep the wording suitable for RTL display."
    if normalized == "english":
        return "Respond in English."
    return "Auto-detect the dominant language of the source text and respond in that language."


def _trim_source(source_text: str, max_chars: int = 14000) -> str:
    cleaned = " ".join(source_text.split())
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[:max_chars]}..."


def build_generation_prompt(
    mode: ModeName,
    source_text: str,
    language: str,
    count: int,
    user_instruction: str,
) -> str:
    source_excerpt = _trim_source(source_text)
    language_clause = _language_clause(language)
    custom_line = f"Additional user instruction: {user_instruction.strip()}" if user_instruction.strip() else ""

    if mode == "mcq":
        mode_schema = dedent(
            """
            Mode requirements (MCQ):
        - Create exactly __COUNT__ multiple-choice questions.
            - Each question must have exactly 4 options.
            - Include plausible distractors (wrong but believable options).
            - Include correct_index from 0-3.
            - Include an explanation for why the correct answer is correct.

            content schema:
            {
              "title": "string",
              "questions": [
                {
                  "id": "string",
                  "question": "string",
                  "options": ["A", "B", "C", "D"],
                  "correct_index": 0,
                  "explanation": "string",
                  "difficulty": "easy|medium|hard|adaptive"
                }
              ]
            }
            """
            ).strip().replace("__COUNT__", str(count))
    elif mode == "flashcard":
        mode_schema = dedent(
            """
            Mode requirements (Flashcard):
              - Create exactly __COUNT__ flashcards.
            - Each card must be question on front and answer on back.
            - Keep each card atomic and testable.

            content schema:
            {
              "deck_title": "string",
              "cards": [
                {
                  "id": "string",
                  "front": "string",
                  "back": "string",
                  "hint": "string"
                }
              ]
            }
            """
        ).strip().replace("__COUNT__", str(count))
    else:
        mode_schema = dedent(
            """
            Mode requirements (Evaluation Model Answer Builder):
            - Build a high-quality model answer for the provided essay question.
            - Keep it hidden-grade quality and semantically rich.

            content schema:
            {
              "question": "string",
              "model_answer": "string",
              "feedback": "",
              "llm_score": 0,
              "strengths": [],
              "improvements": []
            }
            """
        ).strip()

    return dedent(
        f"""
        Requested mode: {mode}
        {language_clause}
        {mode_schema}
        {custom_line}

        Source material:
        {source_excerpt}
        """
    ).strip()


def build_feedback_prompt(
    question: str,
    model_answer: str,
    user_answer: str,
    language: str,
) -> str:
    language_clause = _language_clause(language)
    return dedent(
        f"""
        Requested mode: evaluation
        {language_clause}

        Evaluate the user's essay answer semantically against the model answer.
        Produce constructive and specific feedback.

        content schema:
        {{
          "question": "string",
          "model_answer": "string",
          "llm_score": 0,
          "feedback": "string",
          "strengths": ["string"],
          "improvements": ["string"]
        }}

        Essay question:
        {question.strip()}

        Hidden model answer:
        {model_answer.strip()}

        User answer:
        {user_answer.strip()}
        """
    ).strip()
