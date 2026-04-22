# CLAUDE.md — Omni-RAG Learning Hub & Orchestrator

## What This Is

Full-stack RAG system: Next.js 15 frontend + FastAPI backend.
Study tool with chat, MCQ quizzes, and flashcards powered by multi-provider LLMs.

## Commands

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev        # http://localhost:3000
```

## Architecture

```
backend/
  main.py                  FastAPI entry point
  src/
    core/
      provider_manager.py  LiteLLM multi-provider routing + health + fallback
      ingestion_engine.py  PDF/TXT/DOCX/URL → chunked Documents
      vector_store.py      ChromaDB wrapper
    api/
      routes.py            /health /ingest /chat /generate/mcq /generate/flashcards

frontend/
  app/page.tsx             Root layout (Sidebar + ChatWorkspace)
  components/
    Sidebar.tsx            Provider toggle, document upload, score
    ChatWorkspace.tsx      Streaming chat, /mcq and /flash commands
    MessageRenderer.tsx    Routes messages → bubble | MCQCard | FlashcardDeck
    MCQCard.tsx            Interactive multiple-choice with scoring
    FlashcardDeck.tsx      Framer Motion flip-card carousel
  lib/
    store.ts               Zustand state (messages, mode, knowledgeScore)
    api.ts                 Fetch helpers + SSE stream reader
```

## Provider Modes

- **Privacy Mode (local):** Ollama (port 11434) → LM Studio (port 1234) → Gemini fallback
- **Power Mode (cloud):** Gemini 2.0 Flash / OpenAI GPT-4o

## Slash Commands (in chat)

- `/mcq <topic>` — generate MCQ quiz from ingested documents
- `/flash <topic>` — generate flashcard deck

## Environment Variables

`backend/.env` (copy from root `.env`):
- `GEMINI_API_KEY`, `OPENAI_API_KEY`
- `LM_STUDIO_BASE_URL`, `LM_STUDIO_API_KEY`

`frontend/.env.local`:
- `NEXT_PUBLIC_API_URL=http://localhost:8000`
