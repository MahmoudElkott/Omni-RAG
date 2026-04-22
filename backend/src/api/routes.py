from __future__ import annotations

import json
from typing import Any, AsyncIterator

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..core.ingestion_engine import IngestionEngine
from ..core.provider_manager import ProviderManager, ProviderMode
from ..core.vector_store import VectorStore

router = APIRouter()
_provider = ProviderManager()
_ingestion = IngestionEngine()
_store = VectorStore()


# ── Health ──────────────────────────────────────────────────────────────

@router.get("/health")
async def health() -> dict:
    statuses = await _provider.all_health()
    return {s.provider: {"alive": s.alive, "latency_ms": s.latency_ms} for s in statuses}


# ── Ingest ──────────────────────────────────────────────────────────────

@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)) -> dict:
    data = await file.read()
    docs = _ingestion.ingest_file(data, file.filename or "upload")
    _store.add(docs)
    return {"chunks": len(docs), "source": file.filename}


class UrlRequest(BaseModel):
    url: str


@router.post("/ingest/url")
async def ingest_url(req: UrlRequest) -> dict:
    docs = _ingestion.ingest_url(req.url)
    _store.add(docs)
    return {"chunks": len(docs), "source": req.url}


# ── Chat ────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    mode: str = "cloud"  # "local" | "cloud"
    model: str | None = None
    history: list[dict] = []


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    context_docs = _store.query(req.message, n=5)
    context = "\n\n".join(d["content"] for d in context_docs)

    system = (
        "You are a helpful study assistant. "
        "Use the following context from the user's documents to answer accurately.\n\n"
        f"<context>\n{context}\n</context>"
    )

    messages = [{"role": "system", "content": system}]
    for h in req.history[-10:]:
        messages.append(h)
    messages.append({"role": "user", "content": req.message})

    provider_mode = ProviderMode.LOCAL if req.mode == "local" else ProviderMode.CLOUD

    async def token_stream() -> AsyncIterator[str]:
        async for token in _provider.stream_complete(
            messages=messages,
            model=req.model,
            mode=provider_mode,
        ):
            yield f"data: {json.dumps({'token': token})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(token_stream(), media_type="text/event-stream")


# ── MCQ ─────────────────────────────────────────────────────────────────

class MCQRequest(BaseModel):
    topic: str
    count: int = 5
    mode: str = "cloud"
    model: str | None = None


@router.post("/generate/mcq")
async def generate_mcq(req: MCQRequest) -> dict:
    context_docs = _store.query(req.topic, n=8)
    context = "\n\n".join(d["content"] for d in context_docs)

    prompt = f"""Generate {req.count} multiple-choice questions about: {req.topic}

Context:
{context}

Return ONLY valid JSON in this exact format:
{{
  "type": "mcq",
  "data": [
    {{
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "..."
    }}
  ]
}}"""

    messages = [{"role": "user", "content": prompt}]
    provider_mode = ProviderMode.LOCAL if req.mode == "local" else ProviderMode.CLOUD

    response = await _provider.complete(
        messages=messages,
        model=req.model,
        mode=provider_mode,
        response_format={"type": "json_object"} if req.mode == "cloud" else None,
    )

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")


# ── Flashcards ───────────────────────────────────────────────────────────

class FlashcardRequest(BaseModel):
    topic: str
    count: int = 8
    mode: str = "cloud"
    model: str | None = None


@router.post("/generate/flashcards")
async def generate_flashcards(req: FlashcardRequest) -> dict:
    context_docs = _store.query(req.topic, n=8)
    context = "\n\n".join(d["content"] for d in context_docs)

    prompt = f"""Generate {req.count} flashcards about: {req.topic}

Context:
{context}

Return ONLY valid JSON in this exact format:
{{
  "type": "flashcard",
  "data": [
    {{
      "front": "Question or term",
      "back": "Answer or definition"
    }}
  ]
}}"""

    messages = [{"role": "user", "content": prompt}]
    provider_mode = ProviderMode.LOCAL if req.mode == "local" else ProviderMode.CLOUD

    response = await _provider.complete(
        messages=messages,
        model=req.model,
        mode=provider_mode,
        response_format={"type": "json_object"} if req.mode == "cloud" else None,
    )

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")
