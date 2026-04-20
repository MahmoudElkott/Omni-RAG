from __future__ import annotations

import math
import re
from collections import Counter

from src.llm.client import LiteLLMClient

TOKEN_RE = re.compile(r"\w+", re.UNICODE)


def _cosine_similarity(vector_a: list[float], vector_b: list[float]) -> float:
    if not vector_a or not vector_b or len(vector_a) != len(vector_b):
        return 0.0

    dot_product = sum(a * b for a, b in zip(vector_a, vector_b))
    norm_a = math.sqrt(sum(a * a for a in vector_a))
    norm_b = math.sqrt(sum(b * b for b in vector_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0

    return max(0.0, min(1.0, dot_product / (norm_a * norm_b)))


def _bow_similarity(text_a: str, text_b: str) -> float:
    tokens_a = TOKEN_RE.findall(text_a.lower())
    tokens_b = TOKEN_RE.findall(text_b.lower())
    if not tokens_a or not tokens_b:
        return 0.0

    count_a = Counter(tokens_a)
    count_b = Counter(tokens_b)
    shared_tokens = set(count_a.keys()) | set(count_b.keys())

    vector_a = [float(count_a[token]) for token in shared_tokens]
    vector_b = [float(count_b[token]) for token in shared_tokens]
    return _cosine_similarity(vector_a, vector_b)


def semantic_similarity_score(client: LiteLLMClient, answer_text: str, model_answer_text: str) -> tuple[int, str]:
    vectors = client.embed_texts([answer_text, model_answer_text])
    if vectors:
        similarity = _cosine_similarity(vectors[0], vectors[1])
        return int(round(similarity * 100)), "embedding"

    fallback = _bow_similarity(answer_text, model_answer_text)
    return int(round(fallback * 100)), "bow_fallback"


def combine_hybrid_score(semantic_score: int, llm_score: int, semantic_weight: float = 0.6) -> int:
    semantic_weight = max(0.0, min(1.0, semantic_weight))
    llm_weight = 1.0 - semantic_weight

    blended = semantic_score * semantic_weight + llm_score * llm_weight
    return int(round(max(0.0, min(100.0, blended))))
