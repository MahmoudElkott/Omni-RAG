from __future__ import annotations

import json
import re
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


def _friendly_error(exc: Exception) -> str:
    msg = str(exc)
    if "RateLimitError" in msg or "429" in msg:
        return "Rate limit reached. Please wait a moment or upgrade your API plan."
    if "AuthenticationError" in msg or "401" in msg:
        return "Invalid API key. Please update your key in Settings."
    if "quota" in msg.lower():
        return "API quota exhausted. Check your billing or use a different provider."
    return msg[:200]


# ── Settings ─────────────────────────────────────────────────────────────

import os

class KeysRequest(BaseModel):
    gemini_api_key: str | None = None
    openai_api_key: str | None = None
    lm_studio_base_url: str | None = None

@router.post("/settings/keys")
async def update_keys(req: KeysRequest) -> dict:
    if req.gemini_api_key is not None:
        os.environ["GEMINI_API_KEY"] = req.gemini_api_key
    if req.openai_api_key is not None:
        os.environ["OPENAI_API_KEY"] = req.openai_api_key
    if req.lm_studio_base_url is not None:
        os.environ["LM_STUDIO_BASE_URL"] = req.lm_studio_base_url
    # Invalidate provider health cache so next call re-checks
    _provider._health_cache.clear()
    _provider._last_checked.clear()
    return {"status": "ok"}

@router.get("/settings/keys")
async def get_keys() -> dict:
    def mask(v: str | None) -> str:
        if not v: return ""
        return v[:6] + "…" + v[-3:] if len(v) > 9 else "set"
    return {
        "gemini_api_key": mask(os.environ.get("GEMINI_API_KEY")),
        "openai_api_key": mask(os.environ.get("OPENAI_API_KEY")),
        "lm_studio_base_url": os.environ.get("LM_STUDIO_BASE_URL", ""),
    }


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
        try:
            async for token in _provider.stream_complete(
                messages=messages,
                model=req.model,
                mode=provider_mode,
            ):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as exc:
            err = str(exc)
            if "RateLimitError" in err or "429" in err:
                msg = "⚠ Rate limit reached. Please wait a moment and try again."
            elif "AuthenticationError" in err or "401" in err:
                msg = "⚠ Invalid API key. Check your provider settings."
            else:
                msg = f"⚠ Error: {err[:120]}"
            yield f"data: {json.dumps({'token': msg})}\n\n"
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

    try:
        response = await _provider.complete(
            messages=messages,
            model=req.model,
            mode=provider_mode,
            response_format={"type": "json_object"} if req.mode == "cloud" else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=_friendly_error(exc))

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
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

    try:
        response = await _provider.complete(
            messages=messages,
            model=req.model,
            mode=provider_mode,
            response_format={"type": "json_object"} if req.mode == "cloud" else None,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=_friendly_error(exc))

    raw = response.choices[0].message.content
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")
