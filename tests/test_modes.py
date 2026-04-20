from __future__ import annotations

from src.modes.essay import combine_hybrid_score, semantic_similarity_score
from src.modes.flashcards import normalize_flashcard_payload
from src.modes.mcq import is_correct_answer, normalize_mcq_payload


class FakeClient:
    def embed_texts(self, texts: list[str]) -> list[list[float]] | None:
        if len(texts) != 2:
            return None
        return [[1.0, 0.0, 1.0], [1.0, 0.0, 1.0]]


def test_mcq_correctness() -> None:
    question = {"correct_index": 2}
    assert is_correct_answer(question, 2)
    assert not is_correct_answer(question, 1)


def test_mcq_normalization_adds_id() -> None:
    payload = {
        "mode": "mcq",
        "content": {
            "questions": [
                {
                    "question": "Q",
                    "options": ["A", "B", "C", "D"],
                    "correct_index": 0,
                    "explanation": "Because",
                }
            ]
        },
    }
    normalized = normalize_mcq_payload(payload)
    assert normalized["content"]["questions"][0]["id"].startswith("mcq-")


def test_flashcard_normalization_adds_id() -> None:
    payload = {"mode": "flashcard", "content": {"cards": [{"front": "F", "back": "B"}]}}
    normalized = normalize_flashcard_payload(payload)
    assert normalized["content"]["cards"][0]["id"].startswith("card-")


def test_semantic_score_embedding_path() -> None:
    score, method = semantic_similarity_score(FakeClient(), "answer", "model answer")
    assert score == 100
    assert method == "embedding"


def test_hybrid_score_bounds() -> None:
    assert combine_hybrid_score(semantic_score=95, llm_score=85) == 91
    assert combine_hybrid_score(semantic_score=0, llm_score=0) == 0
    assert combine_hybrid_score(semantic_score=100, llm_score=100) == 100
