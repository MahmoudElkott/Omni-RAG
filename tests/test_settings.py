from __future__ import annotations

from src.config.settings import normalize_model_name


def test_local_lm_studio_model_gets_openai_prefix() -> None:
    normalized = normalize_model_name("Local LM Studio", "qwen/qwen3-vl-4b")
    assert normalized == "openai/qwen/qwen3-vl-4b"


def test_local_lm_studio_model_keeps_openai_prefix() -> None:
    normalized = normalize_model_name("Local LM Studio", "openai/qwen/qwen3-vl-4b")
    assert normalized == "openai/qwen/qwen3-vl-4b"
