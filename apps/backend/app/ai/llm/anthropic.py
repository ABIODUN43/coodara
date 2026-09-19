"""
Anthropic Claude LLM provider.

Implements the LLMProvider contract using the Anthropic Messages API
with token accounting, strict timeouts, and standardized error mapping.
"""

from __future__ import annotations

import time
from typing import Any

import httpx
from app.ai.llm.base import (
    LLMAuthenticationError,
    LLMError,
    LLMMessage,
    LLMProvider,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMResponse,
    LLMTimeoutError,
    TokenUsage,
)


class AnthropicProvider(LLMProvider):
    """
    Anthropic Claude provider implementation.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.anthropic.com/v1",
        timeout_seconds: float = 45.0,
    ) -> None:
        if not api_key:
            raise LLMAuthenticationError("Anthropic API key is required.")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str = "claude-3-5-sonnet-20241022",
        temperature: float = 0.2,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """
        Generate completion via Anthropic Messages API.
        """
        headers = {
            "x-api-key": self._api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }

        system_prompt = None
        anthropic_messages = []

        for m in messages:
            if m.role == "system":
                system_prompt = m.content
            else:
                anthropic_messages.append({
                    "role": "assistant" if m.role == "assistant" else "user",
                    "content": m.content,
                })

        payload: dict[str, Any] = {
            "model": model,
            "messages": anthropic_messages,
            "max_tokens": max_tokens or 4096,
            "temperature": temperature,
        }
        if system_prompt is not None:
            payload["system"] = system_prompt

        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    f"{self._base_url}/messages",
                    headers=headers,
                    json=payload,
                )

            latency_ms = (time.perf_counter() - start_time) * 1000.0

            if response.status_code in {401, 403}:
                raise LLMAuthenticationError(
                    f"Anthropic authentication failed: {response.text}"
                )
            if response.status_code == 429:
                raise LLMRateLimitError(
                    f"Anthropic rate limit exceeded: {response.text}"
                )
            if response.status_code in {500, 502, 503, 504}:
                raise LLMProviderUnavailableError(
                    f"Anthropic service unavailable (HTTP {response.status_code}): {response.text}"
                )

            response.raise_for_status()
            data = response.json()

            content_blocks = data.get("content", [])
            content = "".join(
                b.get("text", "")
                for b in content_blocks
                if b.get("type") == "text"
            )
            stop_reason = data.get("stop_reason")

            raw_usage = data.get("usage", {})
            usage = TokenUsage(
                prompt_tokens=raw_usage.get("input_tokens", 0),
                completion_tokens=raw_usage.get("output_tokens", 0),
                total_tokens=raw_usage.get("input_tokens", 0) + raw_usage.get("output_tokens", 0),
            )

            return LLMResponse(
                content=content,
                model=data.get("model", model),
                usage=usage,
                latency_ms=latency_ms,
                finish_reason=stop_reason,
            )

        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(
                f"Anthropic request timed out after {self._timeout_seconds}s"
            ) from exc
        except (LLMError, httpx.HTTPStatusError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected Anthropic failure: {exc}") from exc