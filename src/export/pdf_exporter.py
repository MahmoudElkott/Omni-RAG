from __future__ import annotations

import html
import io
import re
from pathlib import Path
from typing import Any

import arabic_reshaper
from bidi.algorithm import get_display
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ARABIC_RE = re.compile(r"[\u0600-\u06FF]")


def _register_font() -> str:
    candidates = [
        Path("assets/fonts/NotoNaskhArabic-Regular.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]

    for candidate in candidates:
        if candidate.exists():
            font_name = "AgentUnicodeFont"
            if font_name not in pdfmetrics.getRegisteredFontNames():
                pdfmetrics.registerFont(TTFont(font_name, str(candidate)))
            return font_name

    return "Helvetica"


def _shape_text(value: Any) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    if ARABIC_RE.search(text):
        return get_display(arabic_reshaper.reshape(text))
    return text


def _to_paragraph_markup(value: Any) -> str:
    text = _shape_text(value)
    return html.escape(text).replace("\n", "<br/>")


def to_pdf_bytes(mode: str, payload: dict[str, Any], title: str = "Study Export") -> bytes:
    font_name = _register_font()

    buffer = io.BytesIO()
    document = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=32, rightMargin=32, topMargin=32, bottomMargin=32)

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "AgentTitle",
        parent=styles["Heading1"],
        fontName=font_name,
        fontSize=18,
        leading=24,
    )
    body_style = ParagraphStyle(
        "AgentBody",
        parent=styles["BodyText"],
        fontName=font_name,
        fontSize=10,
        leading=14,
    )

    content = payload.get("content", {})
    story = [Paragraph(_to_paragraph_markup(title), title_style), Spacer(1, 12)]

    if mode == "mcq":
        for idx, question in enumerate(content.get("questions", []), start=1):
            story.append(Paragraph(_to_paragraph_markup(f"Q{idx}. {question.get('question', '')}"), body_style))
            story.append(Spacer(1, 6))
            for option_idx, option in enumerate(question.get("options", []), start=1):
                story.append(Paragraph(_to_paragraph_markup(f"{option_idx}. {option}"), body_style))
            story.append(Spacer(1, 4))
            story.append(Paragraph(_to_paragraph_markup(f"Correct index: {question.get('correct_index', '')}"), body_style))
            story.append(Paragraph(_to_paragraph_markup(f"Explanation: {question.get('explanation', '')}"), body_style))
            story.append(Spacer(1, 10))
    elif mode == "flashcard":
        for idx, card in enumerate(content.get("cards", []), start=1):
            story.append(Paragraph(_to_paragraph_markup(f"Card {idx}"), body_style))
            story.append(Paragraph(_to_paragraph_markup(f"Front: {card.get('front', '')}"), body_style))
            story.append(Paragraph(_to_paragraph_markup(f"Back: {card.get('back', '')}"), body_style))
            if card.get("hint"):
                story.append(Paragraph(_to_paragraph_markup(f"Hint: {card.get('hint', '')}"), body_style))
            story.append(Spacer(1, 10))
    else:
        for key in [
            "question",
            "model_answer",
            "user_answer",
            "semantic_score",
            "llm_score",
            "match_percentage",
            "feedback",
        ]:
            story.append(Paragraph(_to_paragraph_markup(f"{key}: {content.get(key, '')}"), body_style))
            story.append(Spacer(1, 6))

        strengths = content.get("strengths", [])
        improvements = content.get("improvements", [])
        if strengths:
            story.append(Paragraph(_to_paragraph_markup("Strengths:"), body_style))
            for item in strengths:
                story.append(Paragraph(_to_paragraph_markup(f"- {item}"), body_style))
        if improvements:
            story.append(Paragraph(_to_paragraph_markup("Improvements:"), body_style))
            for item in improvements:
                story.append(Paragraph(_to_paragraph_markup(f"- {item}"), body_style))

    document.build(story)
    return buffer.getvalue()
