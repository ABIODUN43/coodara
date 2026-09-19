"""
Semantic Architecture Concept & Pattern Search Engine for Coodara AI.

Enables natural language discovery of architectural concepts (authentication,
rate limiting, async queuing, caching, telemetry, persistence) across codebase symbols.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Sequence

from app.ai.tools.symbol_engine import SymbolDefinition


@dataclass(frozen=True)
class ConceptMatch:
    """A matched code symbol implementing a specific architectural concept."""

    symbol_name: str
    kind: str
    file_path: str
    line_number: int
    matched_concept: str
    confidence: float  # 0.0 to 1.0
    snippet_or_doc: str
    architectural_role: str


@dataclass(frozen=True)
class ConceptSearchResult:
    """Aggregated concept search result."""

    query: str
    identified_concept: str
    matches_count: int
    matches: list[ConceptMatch] = field(default_factory=list)
    summary: str = ""


CONCEPT_KEYWORDS: dict[str, list[str]] = {
    "Authentication & Security": [
        "auth", "jwt", "token", "password", "hash", "rbac", "permission", "security", "bearer", "login", "oauth", "credential"
    ],
    "Rate Limiting & Throttling": [
        "rate_limit", "throttle", "limiter", "token_bucket", "sliding_window", "quota"
    ],
    "Asynchronous Task Queue & Workers": [
        "celery", "worker", "task", "job", "queue", "async", "redis", "consumer", "publisher", "background"
    ],
    "Database & ORM Persistence": [
        "sqlalchemy", "repository", "repo", "session", "model", "database", "postgres", "migration", "query", "crud"
    ],
    "Caching & Performance": [
        "cache", "memoize", "redis", "ttl", "invalidation", "store"
    ],
    "Observability, Metrics & Telemetry": [
        "telemetry", "metric", "logger", "log", "trace", "prometheus", "healthz", "span"
    ],
    "AI Reasoning & LLM Orchestration": [
        "llm", "chat", "intent", "reasoning", "prompt", "gemini", "agent", "assistant", "context_engine"
    ],
    "Architecture Memory & Graph Topology": [
        "graph", "memory", "snapshot", "node", "edge", "cycle", "coupling", "tarjan", "centrality"
    ],
}


def search_architecture_concepts(
    query: str,
    symbols: Sequence[SymbolDefinition],
    memory_entries: Sequence[dict[str, str]] | None = None,
) -> ConceptSearchResult:
    """
    Search for architectural concepts across code symbols and architecture memory.
    """
    query_lower = query.lower()

    # Identify primary concept
    best_concept = "General Architecture Query"
    best_score = 0

    for concept, keywords in CONCEPT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        if score > best_score:
            best_score = score
            best_concept = concept

    matches: list[ConceptMatch] = []
    keywords_to_match = CONCEPT_KEYWORDS.get(best_concept, query_lower.split())

    for s in symbols:
        name_lower = s.name.lower()
        file_lower = s.file_path.lower()
        doc_lower = s.docstring.lower()

        # Calculate symbol relevance score
        match_score = 0
        if any(kw in name_lower for kw in keywords_to_match):
            match_score += 3
        if any(kw in file_lower for kw in keywords_to_match):
            match_score += 2
        if any(kw in doc_lower for kw in keywords_to_match):
            match_score += 1

        if match_score > 0:
            conf = min(1.0, 0.4 + (match_score * 0.2))
            role = f"Implements {best_concept} via {s.kind.value}"
            matches.append(
                ConceptMatch(
                    symbol_name=s.qualified_name,
                    kind=s.kind.value,
                    file_path=s.file_path,
                    line_number=s.line_number,
                    matched_concept=best_concept,
                    confidence=round(conf, 2),
                    snippet_or_doc=s.docstring or s.signature,
                    architectural_role=role,
                )
            )

    # Sort matches by confidence descending
    matches.sort(key=lambda m: m.confidence, reverse=True)
    top_matches = matches[:10]

    summary = (
        f"Found {len(top_matches)} components implementing '{best_concept}' across codebase."
        if top_matches
        else f"No components directly matching '{best_concept}' identified in verified symbol index."
    )

    return ConceptSearchResult(
        query=query,
        identified_concept=best_concept,
        matches_count=len(top_matches),
        matches=top_matches,
        summary=summary,
    )
