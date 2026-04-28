from __future__ import annotations

import asyncio
import subprocess
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, AsyncIterator

import httpx
import litellm
from litellm import acompletion

litellm.drop_params = True


class ProviderMode(str, Enum):
    LOCAL = "local"
    CLOUD = "cloud"


@dataclass
class ProviderConfig:
    name: str
    base_url: str | None
    api_key: str | None
    models: list[str]
    health_url: str
    timeout: float = 5.0


PROVIDERS: dict[str, ProviderConfig] = {
    "ollama": ProviderConfig(
        name="ollama",
        base_url="http://localhost:11434",
        api_key="ollama",
        models=["ollama/qwen3:4b", "ollama/nomic-embed-text"],
        health_url="http://localhost:11434/api/tags",
    ),
    "lm_studio": ProviderConfig(
        name="lm_studio",
        base_url="http://localhost:1234/v1",
        api_key="lm-studio",
        models=["openai/qwen/qwen3-vl-4b"],
        health_url="http://localhost:1234/v1/models",
    ),
    "gemini": ProviderConfig(
        name="gemini",
        base_url=None,
        api_key=None,  # resolved from env GEMINI_API_KEY
        models=["gemini/gemini-2.0-flash", "gemini/gemini-2.0-pro"],
        health_url="",
        timeout=10.0,
    ),
    "openai": ProviderConfig(
        name="openai",
        base_url=None,
        api_key=None,  # resolved from env OPENAI_API_KEY
        models=["gpt-4o-mini", "gpt-4o"],
        health_url="",
        timeout=10.0,
    ),
}


@dataclass
class HealthStatus:
    provider: str
    alive: bool
    latency_ms: float = 0.0
    active_models: list[str] = field(default_factory=list)
    error: str | None = None


class ProviderManager:
    """Manages LLM provider health, auto-load, and fallback routing."""

    def __init__(self, mode: ProviderMode = ProviderMode.CLOUD) -> None:
        self.mode = mode
        self._health_cache: dict[str, HealthStatus] = {}
        self._cache_ttl: float = 30.0
        self._last_checked: dict[str, float] = {}

    async def check_health(self, provider_name: str) -> HealthStatus:
        now = time.monotonic()
        if (
            provider_name in self._health_cache
            and now - self._last_checked.get(provider_name, 0) < self._cache_ttl
        ):
            return self._health_cache[provider_name]

        config = PROVIDERS.get(provider_name)
        if not config or not config.health_url:
            status = HealthStatus(provider=provider_name, alive=True)
            self._health_cache[provider_name] = status
            return status

        t0 = time.monotonic()
        try:
            async with httpx.AsyncClient(timeout=config.timeout) as client:
                resp = await client.get(config.health_url)
                latency = (time.monotonic() - t0) * 1000
                alive = resp.status_code == 200
                models: list[str] = []
                if alive:
                    body = resp.json()
                    if provider_name == "ollama":
                        models = [m["name"] for m in body.get("models", [])]
                    elif provider_name == "lm_studio":
                        models = [m["id"] for m in body.get("data", [])]
                status = HealthStatus(
                    provider=provider_name,
                    alive=alive,
                    latency_ms=round(latency, 1),
                    active_models=models,
                )
        except Exception as exc:
            status = HealthStatus(
                provider=provider_name,
                alive=False,
                latency_ms=(time.monotonic() - t0) * 1000,
                error=str(exc),
            )

        self._health_cache[provider_name] = status
        self._last_checked[provider_name] = now
        return status

    async def ensure_local_model(self, model: str = "qwen3:4b") -> bool:
        """Pull model via Ollama API if not already loaded."""
        status = await self.check_health("ollama")
        if not status.alive:
            return False
        short = model.replace("ollama/", "")
        if short in status.active_models:
            return True
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                await client.post(
                    "http://localhost:11434/api/pull",
                    json={"name": short, "stream": False},
                )
            self._last_checked.pop("ollama", None)  # invalidate cache
            return True
        except Exception:
            return False

    async def resolve_model(
        self,
        preferred_model: str | None = None,
        mode: ProviderMode | None = None,
    ) -> tuple[str, dict[str, Any]]:
        """Return (model_string, litellm_kwargs) with automatic fallback."""
        active_mode = mode or self.mode

        if active_mode == ProviderMode.LOCAL:
            ollama_ok = await self.check_health("ollama")
            if ollama_ok.alive:
                model = preferred_model or "ollama/qwen3:4b"
                return model, {"api_base": "http://localhost:11434"}

            lm_ok = await self.check_health("lm_studio")
            if lm_ok.alive:
                model = preferred_model or "qwen/qwen3-vl-4b"
                return model, {
                    "api_base": "http://localhost:1234/v1",
                    "api_key": "lm-studio",
                }

            # fallback to cloud
        return preferred_model or "gemini/gemini-3.0-flash", {}

    async def complete(
        self,
        messages: list[dict],
        model: str | None = None,
        mode: ProviderMode | None = None,
        stream: bool = False,
        **kwargs: Any,
    ) -> Any:
        resolved_model, extra = await self.resolve_model(model, mode)
        kwargs.update(extra)
        return await acompletion(
            model=resolved_model,
            messages=messages,
            stream=stream,
            **kwargs,
        )

    async def stream_complete(
        self,
        messages: list[dict],
        model: str | None = None,
        mode: ProviderMode | None = None,
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        resolved_model, extra = await self.resolve_model(model, mode)
        kwargs.update(extra)
        response = await acompletion(
            model=resolved_model,
            messages=messages,
            stream=True,
            **kwargs,
        )
        async for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta

    async def all_health(self) -> list[HealthStatus]:
        return await asyncio.gather(
            self.check_health("ollama"),
            self.check_health("lm_studio"),
            self.check_health("gemini"),
            self.check_health("openai"),
        )
