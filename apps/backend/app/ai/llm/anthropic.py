"""
Anthropic LLM provider.

Reserved for a future provider implementation.
"""

from __future__ import annotations

from app.ai.llm.base import LLMProvider


class AnthropicProvider(LLMProvider):
    """
    Anthropic provider placeholder.

    Implementation will be added when Anthropic becomes
    an active Coodara provider.
    """

    async def generate(self, **kwargs):
        raise NotImplementedError(
            "Anthropic provider is not enabled yet.",
        )