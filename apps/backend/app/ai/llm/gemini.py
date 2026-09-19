"""
Google Gemini LLM provider.

Implements the LLMProvider contract using the Google Gemini REST API
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


class GeminiProvider(LLMProvider):
    """
    Google Gemini provider implementation.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta",
        timeout_seconds: float = 45.0,
    ) -> None:
        if not api_key:
            raise LLMAuthenticationError("Google Gemini API key is required.")

        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._timeout_seconds = timeout_seconds

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str = "gemini-2.0-flash",
        temperature: float = 0.2,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """
        Generate completion via Google Gemini generateContent API.
        """
        # Separate system instruction from user/model contents if present
        system_instruction = None
        gemini_contents = []

        for m in messages:
            if m.role == "system":
                system_instruction = {"parts": [{"text": m.content}]}
            elif m.role == "assistant":
                gemini_contents.append({
                    "role": "model",
                    "parts": [{"text": m.content}],
                })
            else:
                gemini_contents.append({
                    "role": "user",
                    "parts": [{"text": m.content}],
                })

        generation_config: dict[str, Any] = {
            "temperature": temperature,
        }
        if max_tokens is not None:
            generation_config["maxOutputTokens"] = max_tokens

        payload: dict[str, Any] = {
            "contents": gemini_contents,
            "generationConfig": generation_config,
        }
        if system_instruction is not None:
            payload["systemInstruction"] = system_instruction

        url = f"{self._base_url}/models/{model}:generateContent?key={self._api_key}"
        start_time = time.perf_counter()

        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"},
                )

            latency_ms = (time.perf_counter() - start_time) * 1000.0

            if response.status_code in {400, 401, 403}:
                err_text = response.text
                if "API_KEY_INVALID" in err_text or "PERMISSION_DENIED" in err_text:
                    raise LLMAuthenticationError(f"Gemini authentication failed: {err_text}")
                raise LLMError(f"Gemini request error: {err_text}")

            if response.status_code == 429:
                raise LLMRateLimitError(f"Gemini rate limit exceeded: {response.text}")

            if response.status_code in {500, 502, 503, 504}:
                raise LLMProviderUnavailableError(
                    f"Gemini service unavailable (HTTP {response.status_code}): {response.text}"
                )

            response.raise_for_status()
            data = response.json()

            candidates = data.get("candidates", [])
            if not candidates:
                raise LLMError("Gemini returned an empty candidate list.")

            first_candidate = candidates[0]
            parts = first_candidate.get("content", {}).get("parts", [])
            content = "".join(p.get("text", "") for p in parts)
            finish_reason = first_candidate.get("finishReason")

            raw_usage = data.get("usageMetadata", {})
            usage = TokenUsage(
                prompt_tokens=raw_usage.get("promptTokenCount", 0),
                completion_tokens=raw_usage.get("candidatesTokenCount", 0),
                total_tokens=raw_usage.get("totalTokenCount", 0),
            )

            return LLMResponse(
                content=content,
                model=model,
                usage=usage,
                latency_ms=latency_ms,
                finish_reason=finish_reason,
            )

        except httpx.TimeoutException as exc:
            raise LLMTimeoutError(
                f"Gemini request timed out after {self._timeout_seconds}s"
            ) from exc
        except (LLMError, httpx.HTTPStatusError):
            raise
        except Exception as exc:
            raise LLMError(f"Unexpected Gemini failure: {exc}") from exc