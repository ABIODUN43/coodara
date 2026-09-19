"""
OpenAI LLM provider.

Implements the LLMProvider contract using the official OpenAI API / httpx client
with token usage tracking, structured error categorization, and strict timeouts.
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from app.ai.llm.base import (
    LLMAuthenticationError,
    LLMContextLengthExceededError,
    LLMError,
    LLMMessage,
    LLMProvider,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponse,
    LLMTimeoutError,
    TokenUsage,
)


class OpenAIProvider(LLMProvider):
    """
    OpenAI provider implementation.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 45.0,
    ) -> None:
        if not api_key:
            raise LLMAuthenticationError("OpenAI API key is required.")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str = "gpt-4o-mini",
        temperature: float = 0.2,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """
        Generate a completion via OpenAI Chat Completions API.
        """
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

        payload: dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": m.role, "content": m.content}
                for m in messages
            ],
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=headers,
                    json=payload,
                )

            latency_ms = (time.perf_counter() - start_time) * 1000.0

            if response.status_code == 401 or response.status_code == 403:
                raise LLMAuthenticationError(
                    f"OpenAI authentication failed: {response.text}"
                )
            if response.status_code == 429:
                raise LLMRateLimitError(
                    f"OpenAI rate limit exceeded: {response.text}"
                )
            if response.status_code in {500, 502, 503, 504}:
                raise LLMProviderUnavailableError(
                    f"OpenAI service unavailable (HTTP {response.status_code}): {response.text}"
                )

            response.raise_for_status()
            data = response.json()

            choices = data.get("choices", [])
            if not choices:
                raise LLMError("OpenAI returned an empty choice list.")

            content = choices[0].get("message", {}).get("content", "")
            finish_reason = choices[0].get("finish_reason")

            raw_usage = data.get("usage", {})
            usage = TokenUsage(
                prompt_tokens=raw_usage.get("prompt_tokens", 0),
                completion_tokens=raw_usage.get("completion_tokens", 0),
                total_tokens=raw_usage.get("total_tokens", 0),
            )

            return LLMResponse(
                content=content,
                model=data.get("model", model),
                usage=usage,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
            )

        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(
                f"OpenAI request timed out after {self._timeout_seconds}s"
            ) from exc
        except (LLMError, httpx.HTTPStatusError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected OpenAI failure: {exc}") from exc