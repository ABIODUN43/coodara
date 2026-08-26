"""
OpenAI LLM provider.
"""

from __future__ import annotations

from app.ai.llm.base import (
    LLMMessage,
    LLMProvider,
    LLMResponse,
)
from openai import AsyncOpenAI


class OpenAIProvider(LLMProvider):
    """OpenAI implementation of the LLM provider interface."""

    def __init__(
        self,
        *,
        api_key: str,
    ) -> None:
        self.client = AsyncOpenAI(
            api_key=api_key,
        )

    async def generate(
        self,
        *,
        messages: list[LLMMessage],
        model: str,
    ) -> LLMResponse:
        response = await self.client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": message.role,
                    "content": message.content,
                }
                for message in messages
            ],
        )

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError(
                "LLM returned an empty response.",
            )

        return LLMResponse(
            content=content,
            model=response.model,
        )