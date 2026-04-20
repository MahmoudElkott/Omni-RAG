# AI Education Agent (Multi-Provider)

Unified Streamlit learning assistant that turns uploaded files and web pages into:
- MCQ quizzes
- Flashcards

## Features
- Multi-provider AI routing via LiteLLM (OpenAI, Gemini, LM Studio)
- Strict JSON contract across all generation modes
- PDF/DOCX/TXT + URL ingestion (including JS-rendered fallback)
- Spaced repetition queue and XP analytics
- Export to JSON, PDF, DOCX, and CSV
- Arabic RTL support
- Sidebar Pomodoro timer

## Run
1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   playwright install
   ```
3. Copy `.env.example` to `.env` and set API keys.
4. Start the app:
   ```bash
   streamlit run app.py
   ```
