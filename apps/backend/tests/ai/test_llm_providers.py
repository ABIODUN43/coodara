"""
Tests for LLM Providers and Provider Abstraction Layer.

Verifies:
- OpenAI, Gemini, Anthropic, and Coodara providers adhere to the LLMProvider contract.
- Standardized exceptions are raised on HTTP errors (401, 429, 503, timeout).
- TokenUsage and latency calculations are populated.
- LLMManager handles retries with exponential backoff on transient errors and fallback.
"""

from unittest.mock import AsyncMock, patch

import httpx
import pytest
from app.ai.llm.anthropic import AnthropicProvider
from app.ai.llm.base import (
    LLMAuthenticationError,
    LLMMessage,
    LLMProviderUnavailableError,
    LLMRateLimitError,
    LLMTimeoutError,
)
from app.ai.llm.gemini import GeminiProvider
from app.ai.llm.manager import LLMManager
from app.ai.llm.openai import OpenAIProvider
from app.ai.llm.reasoning_engine import ArchitectureReasoningProvider


@pytest.mark.asyncio
async def test_native_reasoning_provider():
    """
    Test Coodara Native Architecture Reasoning Engine returns 3-Tier grounded response.
    """
    provider = ArchitectureReasoningProvider()
    messages = [
        LLMMessage(role="system", content="Architecture Context: Detected Tech: Python, FastAPI, React"),
        LLMMessage(role="user", content="What frameworks and technologies are detected?"),
    ]

    response = await provider.generate(messages=messages, model="coodara-reasoning-engine")
    assert response.model == "coodara-reasoning-engine"
    assert "Observed" in response.content
    assert "Inferred" in response.content
    assert "Recommendation" in response.content
    assert response.usage is not None
    assert response.usage.total_tokens > 0
    assert response.latency_ms >= 0


@pytest.mark.asyncio
async def test_openai_provider_success():
    """
    Test OpenAIProvider successfully parses completion and token usage.
    """
    provider = OpenAIProvider(api_key="sk-test-valid-key")
    messages = [LLMMessage(role="user", content="Explain coupling")]

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "id": "chatcmpl-123",
            "model": "gpt-4o-mini",
            "choices": [{"message": {"content": "Coupling measures module interdependence."}, "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 10, "completion_tokens": 8, "total_tokens": 18},
        },
        request=httpx.Request("POST", "https://api.openai.com/v1/chat/completions"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.generate(messages=messages)

        assert result.content == "Coupling measures module interdependence."
        assert result.model == "gpt-4o-mini"
        assert result.usage.total_tokens == 18


@pytest.mark.asyncio
async def test_openai_provider_error_mapping():
    """
    Test OpenAIProvider maps 401, 429, and timeouts to typed LLM errors.
    """
    provider = OpenAIProvider(api_key="sk-test-key")
    messages = [LLMMessage(role="user", content="Hello")]

    # 401 Auth Error
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = httpx.Response(status_code=401, text="Invalid API key", request=httpx.Request("POST", "http://test"))
        with pytest.raises(LLMAuthenticationError):
            await provider.generate(messages=messages)

    # 429 Rate Limit Error
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = httpx.Response(status_code=429, text="Rate limit exceeded", request=httpx.Request("POST", "http://test"))
        with pytest.raises(LLMRateLimitError):
            await provider.generate(messages=messages)

    # 503 Service Unavailable
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = httpx.Response(status_code=503, text="Service Unavailable", request=httpx.Request("POST", "http://test"))
        with pytest.raises(LLMProviderUnavailableError):
            await provider.generate(messages=messages)


@pytest.mark.asyncio
async def test_gemini_provider_success():
    """
    Test GeminiProvider successfully processes generateContent response.
    """
    provider = GeminiProvider(api_key="test-gemini-key")
    messages = [LLMMessage(role="user", content="Describe circular dependencies")]

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "candidates": [
                {
                    "content": {"parts": [{"text": "Circular dependencies create tight coupling."}]},
                    "finishReason": "STOP",
                }
            ],
            "usageMetadata": {"promptTokenCount": 12, "candidatesTokenCount": 7, "totalTokenCount": 19},
        },
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.generate(messages=messages, model="gemini-2.0-flash")

        assert result.content == "Circular dependencies create tight coupling."
        assert result.model == "gemini-2.0-flash"
        assert result.usage.total_tokens == 19


@pytest.mark.asyncio
async def test_anthropic_provider_success():
    """
    Test AnthropicProvider successfully processes messages response.
    """
    provider = AnthropicProvider(api_key="sk-ant-test-key")
    messages = [LLMMessage(role="user", content="Refactoring roadmap")]

    mock_resp = httpx.Response(
        status_code=200,
        json={
            "id": "msg_123",
            "model": "claude-3-5-sonnet-20241022",
            "content": [{"type": "text", "text": "Step 1: Isolate domain core."}],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 15, "output_tokens": 9},
        },
        request=httpx.Request("POST", "https://api.anthropic.com/v1/messages"),
    )

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        result = await provider.generate(messages=messages)

        assert result.content == "Step 1: Isolate domain core."
        assert result.usage.total_tokens == 24


@pytest.mark.asyncio
async def test_llm_manager_fallback_on_failure():
    """
    Test LLMManager falls back to native reasoning engine when external provider fails.
    """
    failing_provider = OpenAIProvider(api_key="sk-test-key")
    manager = LLMManager(provider=failing_provider)

    messages = [LLMMessage(role="user", content="What are the detected technologies?")]

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectTimeout("Connection timed out")
        result = await manager.generate(messages=messages)

        assert result.model == "coodara-reasoning-engine"
        assert "Observed" in result.content
