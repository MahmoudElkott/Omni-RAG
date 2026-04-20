# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Streamlit-based AI education agent that ingests study material (PDF, DOCX, TXT, URLs) and generates interactive MCQ quizzes and flashcards using multi-provider LLM routing via LiteLLM. Supports Arabic RTL, spaced repetition, XP/streak gamification, and export to JSON/PDF/DOCX/CSV.

## Commands

```bash
# Install
pip install -r requirements.txt
playwright install

# Run
streamlit run app.py

# Tests
pytest tests/
pytest tests/test_modes.py -v          # single test file
pytest tests/test_modes.py::test_mcq_correctness -v  # single test
```

## Architecture

The app is a single-page Streamlit app (`app.py`) with three tabs: Study Material, Practice Quiz, Progress Analytics.

### Key data flow

1. **Ingestion** (`src/ingestion/`) — `files.py` extracts text from PDF/DOCX/TXT uploads; `web.py` fetches URLs (static via requests, JS-rendered fallback via Playwright). Both normalize text and feed into `source_material` session state.

2. **Prompt + LLM** (`src/llm/`) — `prompting.py` builds mode-specific prompts with a strict JSON contract. `client.py` wraps LiteLLM's `completion()` with auto-retry and JSON repair: if the LLM output fails schema validation, it appends a repair message and retries (up to 2 retries). `schema.py` defines Pydantic models (`LearningPayload`) and per-mode content validators.

3. **Modes** (`src/modes/`) — `mcq.py`, `flashcards.py`, `essay.py` each handle normalization and mode-specific logic. Essay mode includes semantic similarity via embeddings with bag-of-words fallback.

4. **State** (`src/state/progress.py`) — All session state (XP, streak, history, failed items queue) lives in `st.session_state`, initialized from `BASE_STATE`. History is capped at 250 entries.

5. **Export** (`src/export/`) — Four exporters (JSON, PDF, DOCX, CSV) each produce `bytes`. PDF uses ReportLab with arabic-reshaper + python-bidi for Arabic text shaping.

6. **UI** (`src/ui/`) — `components.py` provides RTL-aware rendering helpers; `styles.css` handles flashcard flip animations and RTL/LTR styling.

### Provider routing

`src/config/settings.py` manages three providers: OpenAI, Gemini, Local LM Studio. Model names are normalized with provider prefixes (e.g., `openai/gpt-4o-mini`, `gemini/gemini-1.5-flash`). LM Studio always gets `openai/` prefix. Config is resolved from sidebar inputs + `.env` defaults.

### LLM JSON contract

All LLM responses must match `{"mode": "...", "content": {...}, "metadata": {...}}`. The `schema.py` validators enforce strict structure per mode (e.g., MCQs must have exactly 4 options, correct_index 0-3, explanation required). Code fences and extraneous text are stripped before parsing.

## Environment Variables (.env)

`OPENAI_API_KEY`, `GEMINI_API_KEY`, `LM_STUDIO_API_KEY`, `LM_STUDIO_BASE_URL`, `DEFAULT_OPENAI_MODEL`, `DEFAULT_GEMINI_MODEL`, `DEFAULT_LOCAL_MODEL`

## Notes

- Source text is trimmed to 14,000 chars before prompting (`_trim_source` in `prompting.py`).
- `response_format: json_object` is only sent for OpenAI/Gemini, not LM Studio (compatibility issue).
- The essay/evaluation mode exists in the prompt builder and schema but is not wired into the Streamlit UI tabs — only MCQ and Flashcard modes are exposed in the Practice Quiz tab.
