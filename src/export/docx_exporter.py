from __future__ import annotations

from io import BytesIO
from typing import Any

from docx import Document


def to_docx_bytes(mode: str, payload: dict[str, Any], title: str = "Study Export") -> bytes:
    document = Document()
    document.add_heading(title, level=1)

    content = payload.get("content", {})

    if mode == "mcq":
        for idx, question in enumerate(content.get("questions", []), start=1):
            document.add_heading(f"Q{idx}: {question.get('question', '')}", level=2)
            options = question.get("options", [])
            for option_idx, option in enumerate(options):
                option_letter = chr(ord("A") + option_idx)
                document.add_paragraph(f"{option_letter}. {option}")
            document.add_paragraph(f"Correct option index: {question.get('correct_index', '')}")
            document.add_paragraph(f"Explanation: {question.get('explanation', '')}")
    elif mode == "flashcard":
        for idx, card in enumerate(content.get("cards", []), start=1):
            document.add_heading(f"Card {idx}", level=2)
            document.add_paragraph(f"Front: {card.get('front', '')}")
            document.add_paragraph(f"Back: {card.get('back', '')}")
            if card.get("hint"):
                document.add_paragraph(f"Hint: {card.get('hint', '')}")
    else:
        document.add_heading("Essay Evaluation", level=2)
        document.add_paragraph(f"Question: {content.get('question', '')}")
        document.add_paragraph(f"Model answer: {content.get('model_answer', '')}")
        document.add_paragraph(f"User answer: {content.get('user_answer', '')}")
        document.add_paragraph(f"Semantic score: {content.get('semantic_score', '')}")
        document.add_paragraph(f"LLM score: {content.get('llm_score', '')}")
        document.add_paragraph(f"Match percentage: {content.get('match_percentage', '')}")
        document.add_paragraph(f"Feedback: {content.get('feedback', '')}")
        if content.get("strengths"):
            document.add_paragraph("Strengths: " + " | ".join(content["strengths"]))
        if content.get("improvements"):
            document.add_paragraph("Improvements: " + " | ".join(content["improvements"]))

    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()
