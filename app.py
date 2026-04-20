from __future__ import annotations

import os
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

import pandas as pd
import streamlit as st
from streamlit_autorefresh import st_autorefresh

from src.config.settings import (
    ProviderRuntimeConfig,
    get_default_models,
    resolve_provider_config,
    validate_provider_config,
)
from src.export.csv_exporter import to_csv_bytes
from src.export.docx_exporter import to_docx_bytes
from src.export.json_exporter import build_export_payload, to_json_bytes
from src.export.pdf_exporter import to_pdf_bytes
from src.ingestion.files import combine_material_chunks, extract_text_from_upload
from src.ingestion.web import extract_text_from_url
from src.llm.client import LiteLLMClient
from src.llm.prompting import build_generation_prompt
from src.modes.flashcards import normalize_flashcard_payload, to_failed_flashcard_item
from src.modes.mcq import is_correct_answer, normalize_mcq_payload, to_failed_mcq_item
from src.state.progress import (
    add_failed_item,
    init_state,
    mark_flashcard_mastered,
    progress_snapshot,
    record_attempt,
    remove_failed_item,
)
from src.ui.components import contains_arabic, load_stylesheet, render_flashcard, render_hero_header, render_section_header, render_text_block


st.set_page_config(
    page_title="AI Education Agent",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

init_state(st.session_state)


def _init_provider_state() -> None:
    defaults = get_default_models()

    st.session_state.setdefault("provider", "Gemini")
    st.session_state.setdefault("openai_api_key", os.getenv("OPENAI_API_KEY", ""))
    st.session_state.setdefault("local_api_key", "lm-studio")
    st.session_state.setdefault("local_base_url", "http://localhost:1234/v1")

    # Always load Gemini key from env if session value is empty
    env_gemini_key = os.getenv("GEMINI_API_KEY", "")
    if not st.session_state.get("gemini_api_key"):
        st.session_state["gemini_api_key"] = env_gemini_key

    st.session_state.setdefault("openai_model", defaults["OpenAI"])
    st.session_state.setdefault("gemini_model", defaults["Gemini"])
    st.session_state.setdefault("local_model", defaults["Local LM Studio"])
    st.session_state.setdefault("output_language", "Auto")


_init_provider_state()

STYLE_PATH = Path(__file__).parent / "src" / "ui" / "styles.css"
if STYLE_PATH.exists():
    load_stylesheet(str(STYLE_PATH))


def _force_rtl(language: str, sample_text: str = "") -> bool:
    return language == "Arabic" or contains_arabic(sample_text)


def _build_client_from_sidebar() -> LiteLLMClient | None:
    config: ProviderRuntimeConfig = resolve_provider_config(
        provider=st.session_state["provider"],
        openai_api_key=st.session_state["openai_api_key"],
        gemini_api_key=st.session_state["gemini_api_key"] or os.getenv("GEMINI_API_KEY", ""),
        local_api_key=st.session_state["local_api_key"],
        local_base_url=st.session_state["local_base_url"],
        openai_model=st.session_state["openai_model"],
        gemini_model=st.session_state["gemini_model"],
        local_model=st.session_state["local_model"],
    )

    issues = validate_provider_config(config)
    if issues:
        for issue in issues:
            st.error(issue)
        return None

    return LiteLLMClient(config)


def _render_pomodoro_widget() -> None:
    pomodoro = st.session_state["pomodoro"]

    st.sidebar.markdown("### Pomodoro")
    duration = st.sidebar.slider(
        "Focus duration (minutes)",
        min_value=5,
        max_value=60,
        step=5,
        value=int(pomodoro.get("duration_minutes", 25)),
    )
    pomodoro["duration_minutes"] = duration

    col_start, col_pause, col_reset = st.sidebar.columns(3)

    if col_start.button("Start", use_container_width=True):
        remaining = pomodoro.get("paused_remaining", 0.0)
        if remaining <= 0:
            remaining = duration * 60.0
        pomodoro["end_timestamp"] = time.time() + remaining
        pomodoro["paused_remaining"] = 0.0
        pomodoro["running"] = True

    if col_pause.button("Pause", use_container_width=True) and pomodoro.get("running"):
        pomodoro["paused_remaining"] = max(0.0, pomodoro.get("end_timestamp", 0.0) - time.time())
        pomodoro["running"] = False

    if col_reset.button("Reset", use_container_width=True):
        pomodoro["running"] = False
        pomodoro["paused_remaining"] = 0.0
        pomodoro["end_timestamp"] = 0.0

    if pomodoro.get("running"):
        st_autorefresh(interval=1000, key="pomodoro-refresh")
        seconds_left = int(max(0.0, pomodoro.get("end_timestamp", 0.0) - time.time()))
        if seconds_left <= 0:
            pomodoro["running"] = False
            pomodoro["paused_remaining"] = 0.0
            pomodoro["completed_sessions"] = int(pomodoro.get("completed_sessions", 0)) + 1
            st.sidebar.success("Pomodoro session completed.")
    else:
        paused_remaining = pomodoro.get("paused_remaining", 0.0)
        if paused_remaining > 0:
            seconds_left = int(paused_remaining)
        else:
            seconds_left = int(duration * 60)

    minutes, seconds = divmod(seconds_left, 60)
    st.sidebar.metric("Timer", f"{minutes:02d}:{seconds:02d}")
    st.sidebar.caption(f"Completed sessions: {int(pomodoro.get('completed_sessions', 0))}")


def _render_sidebar() -> None:
    st.sidebar.markdown(
        """
        <div style="padding: 0.3rem 0 0.2rem;">
            <h1 style="
                font-size: 1.15rem;
                font-weight: 700;
                background: linear-gradient(135deg, #a78bfa, #f472b6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 0.1rem;
            ">Unified Learning Agent</h1>
            <p style="color: #6e6a96; font-size: 0.72rem; margin: 0;">Multi-provider AI education workspace</p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    st.sidebar.selectbox(
        "Provider",
        ["OpenAI", "Gemini", "Local LM Studio"],
        key="provider",
    )

    st.sidebar.markdown("### API Configuration")
    st.sidebar.text_input("OpenAI API Key", type="password", key="openai_api_key")
    st.sidebar.text_input("Gemini API Key", type="password", key="gemini_api_key")
    st.sidebar.text_input("LM Studio API Key", type="password", key="local_api_key")
    st.sidebar.text_input("LM Studio Endpoint", key="local_base_url")

    st.sidebar.markdown("### Model Selection")
    st.sidebar.text_input("OpenAI Model", key="openai_model")
    st.sidebar.text_input("Gemini Model", key="gemini_model")
    st.sidebar.text_input("Local Model", key="local_model")

    st.sidebar.selectbox(
        "Output language",
        ["Auto", "English", "Arabic"],
        key="output_language",
    )

    _render_pomodoro_widget()


_render_sidebar()


def _render_export_section(mode: str, payload: dict[str, Any]) -> None:
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    export_object = build_export_payload(mode, payload, extra={"progress": progress_snapshot(st.session_state)})

    json_bytes = to_json_bytes(export_object)
    pdf_bytes = to_pdf_bytes(mode, payload, title=f"AI Education Agent - {mode.title()}")
    docx_bytes = to_docx_bytes(mode, payload, title=f"AI Education Agent - {mode.title()}")
    csv_bytes = to_csv_bytes(mode, payload)

    st.markdown("---")
    st.markdown("##### Export")
    col_json, col_pdf, col_docx, col_csv = st.columns(4)
    col_json.download_button(
        "JSON",
        data=json_bytes,
        file_name=f"study-{mode}-{timestamp}.json",
        mime="application/json",
        use_container_width=True,
    )
    col_pdf.download_button(
        "PDF",
        data=pdf_bytes,
        file_name=f"study-{mode}-{timestamp}.pdf",
        mime="application/pdf",
        use_container_width=True,
    )
    col_docx.download_button(
        "DOCX",
        data=docx_bytes,
        file_name=f"study-{mode}-{timestamp}.docx",
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        use_container_width=True,
    )
    col_csv.download_button(
        "CSV",
        data=csv_bytes,
        file_name=f"study-{mode}-{timestamp}.csv",
        mime="text/csv",
        use_container_width=True,
    )


def _render_failed_queue(force_rtl: bool) -> None:
    failed_items = st.session_state.get("failed_items", [])
    if not failed_items:
        st.info("No failed items in the spaced repetition queue yet.")
        return

    st.markdown(f"#### Spaced Repetition Queue ({len(failed_items)})")
    for idx, item in enumerate(failed_items):
        item_type = item.get("type")
        item_id = str(item.get("id", f"item-{idx}"))

        with st.container(border=True):
            if item_type == "mcq":
                question_text = str(item.get("question", ""))
                render_text_block(f"Retry MCQ: {question_text}", force_rtl=force_rtl)
                options = [str(option) for option in item.get("options", [])]

                if len(options) != 4:
                    st.warning("Skipped invalid retry item.")
                    continue

                selected_option = st.radio(
                    "Choose an answer",
                    options,
                    key=f"retry-mcq-choice-{item_id}-{idx}",
                )
                if st.button("Check retry", key=f"retry-mcq-submit-{item_id}-{idx}"):
                    selected_index = options.index(selected_option)
                    is_correct = int(item.get("correct_index", -1)) == selected_index
                    if is_correct:
                        st.success("Correct. Item removed from spaced repetition queue.")
                        remove_failed_item(st.session_state, "mcq", item_id)
                        record_attempt(
                            st.session_state,
                            mode="mcq",
                            item_id=f"retry-{item_id}",
                            prompt=question_text,
                            correct=True,
                            detail="Spaced repetition retry",
                        )
                        st.rerun()
                    else:
                        st.error("Still incorrect. Keep reviewing this card.")
            elif item_type == "flashcard":
                card = {"front": item.get("front", ""), "back": item.get("back", "")}
                render_flashcard(card, flipped=False, force_rtl=force_rtl)

                col_keep, col_done = st.columns(2)
                if col_keep.button("Keep in queue", key=f"retry-flash-keep-{item_id}-{idx}"):
                    st.info("Item kept for later review.")
                if col_done.button("Mastered", key=f"retry-flash-done-{item_id}-{idx}"):
                    remove_failed_item(st.session_state, "flashcard", item_id)
                    record_attempt(
                        st.session_state,
                        mode="flashcard",
                        item_id=f"retry-{item_id}",
                        prompt=str(item.get("front", "")),
                        correct=True,
                        detail="Spaced repetition mastered",
                    )
                    st.success("Great work. Removed from queue.")
                    st.rerun()


def _render_mcq_mode(payload: dict[str, Any], force_rtl: bool) -> None:
    payload = normalize_mcq_payload(payload)
    questions = payload.get("content", {}).get("questions", [])

    if not questions:
        st.warning("No MCQs available.")
        return

    st.markdown("---")
    for index, question in enumerate(questions, start=1):
        qid = str(question.get("id", f"mcq-{index}"))
        options = [str(option) for option in question.get("options", [])]
        if len(options) != 4:
            continue

        with st.container(border=True):
            render_text_block(f"Q{index}. {question.get('question', '')}", force_rtl=force_rtl)
            selected_option = st.radio(
                "Choose one option",
                options,
                key=f"mcq-choice-{qid}",
            )

            if st.button("Submit answer", key=f"mcq-submit-{qid}"):
                selected_index = options.index(selected_option)
                correct = is_correct_answer(question, selected_index)

                st.session_state["mcq_results"][qid] = {
                    "selected_index": selected_index,
                    "correct": correct,
                }

                xp_delta = record_attempt(
                    st.session_state,
                    mode="mcq",
                    item_id=qid,
                    prompt=str(question.get("question", "")),
                    correct=correct,
                    detail=f"Selected index: {selected_index}",
                )

                if correct:
                    st.success(f"Correct. XP change: +{xp_delta}")
                else:
                    add_failed_item(st.session_state, to_failed_mcq_item(question, selected_index))
                    st.error(f"Incorrect. XP change: {xp_delta}")

            result = st.session_state.get("mcq_results", {}).get(qid)
            if result is not None:
                correct_index = int(question.get("correct_index", 0))
                selected_index = int(result.get("selected_index", -1))
                selected_value = options[selected_index] if 0 <= selected_index < len(options) else "N/A"
                correct_value = options[correct_index]

                if bool(result.get("correct")):
                    st.success(f"You selected: {selected_value}")
                else:
                    st.warning(f"You selected: {selected_value} | Correct: {correct_value}")

                render_text_block(f"Explanation: {question.get('explanation', '')}", force_rtl=force_rtl)


def _render_flashcard_mode(payload: dict[str, Any], force_rtl: bool) -> None:
    payload = normalize_flashcard_payload(payload)
    cards = payload.get("content", {}).get("cards", [])

    if not cards:
        st.warning("No flashcards available.")
        return

    st.markdown("---")
    for index, card in enumerate(cards, start=1):
        card_id = str(card.get("id", f"card-{index}"))
        flip_key = f"flashcard-flip-{card_id}"
        st.session_state.setdefault(flip_key, False)

        with st.container(border=True):
            st.caption(f"Card {index}")
            render_flashcard(card, st.session_state[flip_key], force_rtl=force_rtl)

            col_flip, col_mastered, col_review = st.columns(3)
            if col_flip.button("Flip", key=f"flashcard-flip-btn-{card_id}"):
                st.session_state[flip_key] = not st.session_state[flip_key]
                st.rerun()

            if col_mastered.button("I got it", key=f"flashcard-mastered-{card_id}"):
                first_time = mark_flashcard_mastered(st.session_state, card_id)
                if first_time:
                    xp_delta = record_attempt(
                        st.session_state,
                        mode="flashcard",
                        item_id=card_id,
                        prompt=str(card.get("front", "")),
                        correct=True,
                        detail="Flashcard mastered",
                    )
                    st.success(f"Card mastered. XP change: +{xp_delta}")
                else:
                    st.info("Already marked as mastered.")

            if col_review.button("Need review", key=f"flashcard-review-{card_id}"):
                add_failed_item(st.session_state, to_failed_flashcard_item(card))
                xp_delta = record_attempt(
                    st.session_state,
                    mode="flashcard",
                    item_id=f"review-{card_id}",
                    prompt=str(card.get("front", "")),
                    correct=False,
                    detail="Flashcard moved to spaced repetition",
                )
                st.warning(f"Added to spaced repetition. XP change: {xp_delta}")


def _render_study_material_tab() -> None:
    render_section_header("\U0001f4da", "Study Material")

    uploads = st.file_uploader(
        "Upload PDF, DOCX, or TXT files",
        type=["pdf", "docx", "txt"],
        accept_multiple_files=True,
    )

    url_col, js_col = st.columns([3, 1])
    source_url = url_col.text_input("Web link to study", placeholder="https://example.com/article")
    allow_js = js_col.checkbox("JS render", value=True)

    if st.button("Read URL content"):
        if not source_url.strip():
            st.warning("Enter a URL first.")
        else:
            with st.spinner("Extracting web content..."):
                try:
                    web_text, notes = extract_text_from_url(source_url.strip(), allow_js_fallback=allow_js)
                    st.session_state["web_material"] = web_text
                    st.session_state["source_notes"] = notes
                    st.success("Web content extracted and ready.")
                except Exception as exc:  # noqa: BLE001
                    st.error(str(exc))

    manual_notes = st.text_area(
        "Additional notes",
        placeholder="Paste notes, transcripts, or context here.",
        height=140,
    )

    if st.button("Compile study material", type="primary"):
        chunks: list[str] = []
        notes: list[str] = []

        if uploads:
            for uploaded_file in uploads:
                try:
                    text, filename = extract_text_from_upload(uploaded_file)
                    if text:
                        chunks.append(text)
                        notes.append(f"Loaded file: {filename} ({len(text)} chars)")
                except Exception as exc:  # noqa: BLE001
                    notes.append(f"Failed to load {uploaded_file.name}: {exc}")

        web_material = st.session_state.get("web_material", "")
        if web_material:
            chunks.append(web_material)
            notes.append(f"Loaded URL material ({len(web_material)} chars)")

        if manual_notes.strip():
            chunks.append(manual_notes.strip())
            notes.append(f"Included manual notes ({len(manual_notes.strip())} chars)")

        combined = combine_material_chunks(chunks)
        st.session_state["source_material"] = combined
        st.session_state["source_notes"] = notes

        if combined:
            st.success(f"Study material compiled. Total size: {len(combined)} characters.")
        else:
            st.warning("No content was extracted. Try uploading files or a URL.")

    material = st.session_state.get("source_material", "")
    if material:
        st.markdown("#### Material Summary")
        st.caption(f"Characters: {len(material)}")

        for note in st.session_state.get("source_notes", []):
            st.caption(note)

        preview = material[:1800] + ("..." if len(material) > 1800 else "")
        render_text_block(preview, force_rtl=_force_rtl(st.session_state["output_language"], preview))


def _render_practice_quiz_tab() -> None:
    render_section_header("\U0001f9e0", "Practice Quiz")

    source_material = st.session_state.get("source_material", "")
    if not source_material:
        st.info("Compile study material first from the Study Material tab.")
        return

    mode_label = st.radio(
        "Choose learning mode",
        ["MCQ Generator", "Flashcards"],
        horizontal=True,
    )
    force_rtl = _force_rtl(st.session_state["output_language"], source_material)

    mode_map = {
        "MCQ Generator": "mcq",
        "Flashcards": "flashcard",
    }
    selected_mode = mode_map[mode_label]

    count = st.slider(
        "How many items to generate?",
        min_value=1,
        max_value=100,
        value=5,
        step=1,
    )
    custom_instruction = st.text_input(
        "Optional instruction",
        placeholder="Example: focus on conceptual traps and real-world applications",
    )

    if st.button("Generate with AI", type="primary"):
        client = _build_client_from_sidebar()
        if client:
            with st.spinner("Generating study content..."):
                try:
                    prompt = build_generation_prompt(
                        mode=selected_mode,
                        source_text=source_material,
                        language=st.session_state["output_language"],
                        count=count,
                        user_instruction=custom_instruction,
                    )
                    payload = client.generate_structured(selected_mode, prompt)
                    if selected_mode == "mcq":
                        payload = normalize_mcq_payload(payload)
                    else:
                        payload = normalize_flashcard_payload(payload)

                    st.session_state["generated_payload"] = payload
                    st.session_state["generated_mode"] = selected_mode
                    st.success("Content generated successfully.")
                except Exception as exc:  # noqa: BLE001
                    st.error(f"Generation failed: {exc}")

    generated_payload = st.session_state.get("generated_payload")
    generated_mode = st.session_state.get("generated_mode")
    if generated_payload and generated_mode == selected_mode:
        if selected_mode == "mcq":
            _render_mcq_mode(generated_payload, force_rtl)
        else:
            _render_flashcard_mode(generated_payload, force_rtl)

        _render_export_section(selected_mode, generated_payload)

    with st.expander("Spaced repetition"):
        _render_failed_queue(force_rtl)


def _render_progress_tab() -> None:
    render_section_header("\U0001f4ca", "Progress Analytics")

    snapshot = progress_snapshot(st.session_state)
    col_xp, col_streak, col_accuracy, col_failed = st.columns(4)
    col_xp.metric("XP", snapshot["xp"])
    col_streak.metric("Streak", snapshot["streak"])
    col_accuracy.metric("Accuracy", f"{snapshot['accuracy']}%")
    col_failed.metric("Failed queue", snapshot["failed_queue"])

    mode_stats = snapshot.get("attempts_by_mode", {})
    mode_df = pd.DataFrame(
        {
            "mode": list(mode_stats.keys()),
            "attempts": list(mode_stats.values()),
        }
    )
    st.markdown("### Attempts by Mode")
    st.bar_chart(mode_df.set_index("mode"))

    history = st.session_state.get("history", [])
    if history:
        history_df = pd.DataFrame(history)
        history_df["time"] = pd.to_datetime(history_df["time"])
        history_df = history_df.sort_values("time")
        history_df["xp_total"] = history_df["xp_delta"].cumsum()

        st.markdown("### XP Trajectory")
        st.line_chart(history_df.set_index("time")["xp_total"])

        st.markdown("### Recent Activity")
        st.dataframe(
            history_df[["time", "mode", "item_id", "correct", "xp_delta", "detail"]].tail(20),
            use_container_width=True,
        )
    else:
        st.info("No attempts yet. Start practicing to populate analytics.")

    st.markdown("### Pomodoro")
    st.metric("Completed focus sessions", snapshot.get("pomodoro_sessions", 0))


render_hero_header("AI Education Agent", "Transform content into interactive learning tools with multi-provider AI orchestration")

study_tab, practice_tab, progress_tab = st.tabs(["Study Material", "Practice Quiz", "Progress Analytics"])

with study_tab:
    _render_study_material_tab()

with practice_tab:
    _render_practice_quiz_tab()

with progress_tab:
    _render_progress_tab()
