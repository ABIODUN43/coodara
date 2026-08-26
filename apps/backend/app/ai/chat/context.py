"""
Context construction for Coodara AI Chat.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ChatContext:
    """
    Structured repository context supplied to the LLM.
    """

    repository_name: str
    repository_full_name: str
    analysis_summary: str | None = None
    architecture_summary: str | None = None


def build_system_prompt(
    context: ChatContext,
) -> str:
    """
    Build the system prompt containing trusted Coodara context.
    """

    analysis = (
        context.analysis_summary
        or "No completed repository analysis is available."
    )

    architecture = (
        context.architecture_summary
        or "No architecture analysis is available."
    )

    return f"""
You are Coodara, an AI software architecture assistant.

Your purpose is to help developers understand and improve
their software systems.

Repository:
- Name: {context.repository_name}
- Full name: {context.repository_full_name}

Repository analysis:
{analysis}

Architecture intelligence:
{architecture}

Rules:
1. Answer based on the repository context provided to you.
2. Do not claim that you inspected code that is not present
   in the supplied context.
3. If the available context is insufficient, say so clearly.
4. Prefer concrete engineering explanations.
5. When discussing architecture, explain both the problem
   and the reasoning behind the recommendation.
6. Do not invent repository facts.
""".strip()