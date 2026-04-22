from __future__ import annotations

from typing import Any

import chromadb
from chromadb.config import Settings

from .ingestion_engine import Document

_CLIENT = chromadb.Client(
    Settings(anonymized_telemetry=False, allow_reset=True)
)


class VectorStore:
    """ChromaDB-backed store with nomic-embed-text embeddings via Ollama."""

    def __init__(self, collection_name: str = "omni_rag") -> None:
        self._collection = _CLIENT.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    def add(self, docs: list[Document]) -> None:
        if not docs:
            return
        ids = [f"{d.source}::{d.metadata['chunk']}" for d in docs]
        texts = [d.content for d in docs]
        metas = [{"source": d.source, **d.metadata} for d in docs]
        self._collection.upsert(ids=ids, documents=texts, metadatas=metas)

    def query(self, text: str, n: int = 5) -> list[dict[str, Any]]:
        results = self._collection.query(query_texts=[text], n_results=n)
        docs = results.get("documents", [[]])[0]
        metas = results.get("metadatas", [[]])[0]
        return [{"content": d, "metadata": m} for d, m in zip(docs, metas)]

    def reset(self) -> None:
        _CLIENT.reset()
