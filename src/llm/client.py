from __future__ import annotations

from typing import Any

from litellm import completion, embedding

from src.config.settings import ProviderRuntimeConfig

from .prompting import MASTER_SYSTEM_PROMPT
from .schema import ModeName, build_repair_message, parse_and_validate_payload


class LiteLLMClient:
    def __init__(self, config: ProviderRuntimeConfig) -> None:
        self.config = config

    def _auth_kwargs(self) -> dict[str, Any]:
        kwargs: dict[str, Any] = {}
        if self.config.api_key:
            kwargs["api_key"] = self.config.api_key
        if self.config.base_url:
            kwargs["api_base"] = self.config.base_url
        return kwargs

    @staticmethod
    def _extract_content(response: Any) -> str:
        try:
            if isinstance(response, dict):
                return str(response["choices"][0]["message"]["content"])
            return str(response.choices[0].message.content)
        except Exception as exc:  # noqa: BLE001
            raise ValueError(f"Unable to parse completion response: {exc}") from exc

    @staticmethod
    def _extract_total_tokens(response: Any) -> int:
        usage = response.get("usage") if isinstance(response, dict) else getattr(response, "usage", None)
        if usage is None:
            return 0
        if isinstance(usage, dict):
            return int(usage.get("total_tokens", 0) or 0)
        return int(getattr(usage, "total_tokens", 0) or 0)

    def generate_structured(
        self,
        expected_mode: ModeName,
        user_prompt: str,
        *,
        max_tokens: int = 1800,
        temperature: float = 0.25,
        retries: int = 2,
    ) -> dict[str, Any]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": MASTER_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        last_error: Exception | None = None
        for _attempt in range(retries + 1):
            completion_kwargs: dict[str, Any] = {
                "model": self.config.model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                **self._auth_kwargs(),
            }

            # LM Studio's OpenAI-compatible API may reject json_object response_format.
            if self.config.provider != "Local LM Studio":
                completion_kwargs["response_format"] = {"type": "json_object"}

            response = completion(**completion_kwargs)

            raw_content = self._extract_content(response)
            token_count = self._extract_total_tokens(response)

            try:
                return parse_and_validate_payload(raw_content, expected_mode=expected_mode, tokens_used=token_count)
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                messages.append({"role": "assistant", "content": raw_content})
                messages.append(
                    {
                        "role": "user",
                        "content": build_repair_message(expected_mode, str(exc)),
                    }
                )

        raise RuntimeError(f"LLM output validation failed after retries: {last_error}")

    def _normalize_embedding_model(self) -> str | None:
        model_name = (self.config.embedding_model or "").strip()
        if not model_name:
            return None

        if "/" in model_name:
            return model_name

        if self.config.provider == "OpenAI":
            return f"openai/{model_name}"
        if self.config.provider == "Gemini":
            return f"gemini/{model_name}"
        return f"openai/{model_name}"

    def embed_texts(self, texts: list[str]) -> list[list[float]] | None:
        embedding_model = self._normalize_embedding_model()
        if not embedding_model:
            return None

        try:
            result = embedding(
                model=embedding_model,
                input=texts,
                **self._auth_kwargs(),
            )
        except Exception:
            return None

        data = result.get("data") if isinstance(result, dict) else getattr(result, "data", None)
        if not data:
            return None

        vectors: list[list[float]] = []
        for row in data:
            if isinstance(row, dict):
                vector = row.get("embedding")
            else:
                vector = getattr(row, "embedding", None)
            if isinstance(vector, list) and vector:
                vectors.append([float(value) for value in vector])

        return vectors if len(vectors) == len(texts) else None
