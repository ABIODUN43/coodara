"""
Google Gemini LLM provider.

Reserved for a future provider implementation.
"""

from __future__ import annotations

from app.ai.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    """
    Gemini provider placeholder.

    Implementation will be added when Gemini becomes
    an active Coodara provider.
    """

    async def generate(self, **kwargs):
        raise NotImplementedError(
            "Gemini provider is not enabled yet.",
        )