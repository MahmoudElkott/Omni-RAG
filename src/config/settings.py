from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal

from dotenv import load_dotenv

load_dotenv()

ProviderName = Literal["OpenAI", "Gemini", "Local LM Studio"]

DEFAULT_PROVIDER_MODELS = {
    "OpenAI": os.getenv("DEFAULT_OPENAI_MODEL", "gpt-4o-mini"),
    "Gemini": os.getenv("DEFAULT_GEMINI_MODEL", "gemini-1.5-flash"),
    "Local LM Studio": os.getenv("DEFAULT_LOCAL_MODEL", "local-model"),
}

DEFAULT_EMBEDDING_MODELS = {
    "OpenAI": os.getenv("DEFAULT_OPENAI_EMBED_MODEL", "text-embedding-3-small"),
    "Gemini": os.getenv("DEFAULT_GEMINI_EMBED_MODEL", "text-embedding-004"),
    # Local embedding availability varies by model/server.
    "Local LM Studio": os.getenv("DEFAULT_LOCAL_EMBED_MODEL", ""),
}


@dataclass(frozen=True)
class ProviderRuntimeConfig:
    provider: ProviderName
    model: str
    api_key: str
    base_url: str | None = None
    embedding_model: str | None = None


def get_default_models() -> dict[str, str]:
    return dict(DEFAULT_PROVIDER_MODELS)


def get_default_embedding_models() -> dict[str, str]:
    return dict(DEFAULT_EMBEDDING_MODELS)


def sanitize_base_url(url: str | None) -> str:
    candidate = (url or os.getenv("LM_STUDIO_BASE_URL") or "http://localhost:1234/v1").strip()
    if not candidate:
        return "http://localhost:1234/v1"
    return candidate.rstrip("/")


def normalize_model_name(provider: ProviderName, model_name: str) -> str:
    trimmed = model_name.strip()
    if not trimmed:
        trimmed = DEFAULT_PROVIDER_MODELS[provider]

    if provider == "Local LM Studio":
        if trimmed.startswith("openai/"):
            return trimmed
        return f"openai/{trimmed}"

    if "/" in trimmed:
        return trimmed

    if provider == "OpenAI":
        return f"openai/{trimmed}"
    if provider == "Gemini":
        return f"gemini/{trimmed}"
    return f"openai/{trimmed}"


def resolve_provider_config(
    provider: ProviderName,
    openai_api_key: str,
    gemini_api_key: str,
    local_api_key: str,
    local_base_url: str,
    openai_model: str,
    gemini_model: str,
    local_model: str,
) -> ProviderRuntimeConfig:
    model_by_provider = {
        "OpenAI": openai_model,
        "Gemini": gemini_model,
        "Local LM Studio": local_model,
    }

    key_by_provider = {
        "OpenAI": openai_api_key,
        "Gemini": gemini_api_key,
        "Local LM Studio": local_api_key or os.getenv("LM_STUDIO_API_KEY", "lm-studio"),
    }

    model = normalize_model_name(provider, model_by_provider[provider])
    embedding_model = get_default_embedding_models().get(provider) or None
    base_url = sanitize_base_url(local_base_url) if provider == "Local LM Studio" else None

    return ProviderRuntimeConfig(
        provider=provider,
        model=model,
        api_key=key_by_provider[provider].strip(),
        base_url=base_url,
        embedding_model=embedding_model,
    )


def validate_provider_config(config: ProviderRuntimeConfig) -> list[str]:
    issues: list[str] = []

    if config.provider in {"OpenAI", "Gemini"} and not config.api_key:
        issues.append(f"Missing API key for {config.provider}.")

    if config.provider == "Local LM Studio" and not config.base_url:
        issues.append("LM Studio base URL is required.")

    return issues
