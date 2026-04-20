from __future__ import annotations

import html
import re
from pathlib import Path
from typing import Any

import streamlit as st

ARABIC_RE = re.compile(r"[\u0600-\u06FF]")


def load_stylesheet(css_path: str) -> None:
    css_text = Path(css_path).read_text(encoding="utf-8")
    st.markdown(f"<style>{css_text}</style>", unsafe_allow_html=True)


def render_hero_header(title: str, subtitle: str) -> None:
    st.markdown(
        f"""
        <div style="text-align:center; padding: 0.8rem 0 0.4rem;">
            <h1 style="
                font-size: 2.2rem;
                font-weight: 800;
                letter-spacing: -0.03em;
                background: linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #38bdf8 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 0.3rem;
            ">{html.escape(title)}</h1>
            <p style="
                color: #6e6a96;
                font-size: 0.9rem;
                font-weight: 400;
                margin: 0;
            ">{html.escape(subtitle)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_section_header(icon: str, title: str) -> None:
    st.markdown(
        f"""
        <div style="
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 1rem 0 0.6rem;
        ">
            <span style="font-size: 1.3rem;">{icon}</span>
            <h2 style="
                margin: 0 !important;
                font-size: 1.35rem !important;
                font-weight: 700 !important;
                color: #eae8fd !important;
            ">{html.escape(title)}</h2>
        </div>
        """,
        unsafe_allow_html=True,
    )


def contains_arabic(text: str) -> bool:
    return bool(ARABIC_RE.search(text or ""))


def render_text_block(text: str, *, force_rtl: bool = False) -> None:
    rtl = force_rtl or contains_arabic(text)
    css_class = "rtl-text" if rtl else "ltr-text"
    escaped = html.escape(text or "").replace("\n", "<br/>")
    st.markdown(f"<div class='{css_class}'>{escaped}</div>", unsafe_allow_html=True)


def render_flashcard(card: dict[str, Any], flipped: bool, *, force_rtl: bool = False) -> None:
    front = str(card.get("front", "")).strip()
    back = str(card.get("back", "")).strip()

    front_rtl = force_rtl or contains_arabic(front)
    back_rtl = force_rtl or contains_arabic(back)

    front_class = "rtl-text" if front_rtl else "ltr-text"
    back_class = "rtl-text" if back_rtl else "ltr-text"

    flipped_class = "flipped" if flipped else ""

    st.markdown(
        (
            "<div class='flashcard-shell'>"
            f"<div class='flashcard {flipped_class}'>"
            "<div class='flashcard-inner'>"
            f"<div class='flashcard-face flashcard-front {front_class}'>{html.escape(front)}</div>"
            f"<div class='flashcard-face flashcard-back {back_class}'>{html.escape(back)}</div>"
            "</div>"
            "</div>"
            "</div>"
        ),
        unsafe_allow_html=True,
    )
