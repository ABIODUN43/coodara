"""
Hybrid Dense-Sparse Architecture Memory Retriever for Coodara V2 (Silicon Valley Standard).

Combines Dense Vector Semantic Embeddings (Cosine Similarity) with Sparse Lexical Matching
for enterprise-grade architectural benchmarking.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Sequence

from app.ai.memory.embeddings import (
    cosine_similarity,
    generate_semantic_embedding,
)
from app.models.memory import ArchitectureMemoryEntry, MemoryType


@dataclass(frozen=True)
class ScoredMemoryEntry:
    """
    Memory entry with hybrid dense-sparse similarity score and provenance.
    """

    entry: ArchitectureMemoryEntry
    score: float  # Final fused similarity score [0.0, 1.0]
    dense_score: float  # Cosine similarity [0.0, 1.0]
    sparse_score: float  # Lexical overlap score [0.0, 1.0]
    matched_terms: list[str]
    retrieval_mode: str = "hybrid_rrf"


class ArchitectureMemoryRetriever:
    """
    Tenant-isolated hybrid search and ranking engine for Architecture Memory.
    """

    def rank_entries(
        self,
        *,
        entries: Sequence[ArchitectureMemoryEntry],
        query: str,
        limit: int = 10,
    ) -> list[ScoredMemoryEntry]:
        """
        Rank memory entries against a query string using Hybrid Dense-Sparse scoring.
        """
        if not entries:
            return []

        if not query.strip():
            return [
                ScoredMemoryEntry(
                    entry=e,
                    score=e.confidence,
                    dense_score=e.confidence,
                    sparse_score=1.0,
                    matched_terms=[],
                    retrieval_mode="default_confidence",
                )
                for e in entries[:limit]
            ]

        query_clean = query.strip()
        query_tokens = set(re.findall(r"\w+", query_clean.lower()))
        query_vec = generate_semantic_embedding(query_clean)

        scored_entries: list[ScoredMemoryEntry] = []

        for entry in entries:
            text = f"{entry.title} {entry.content} {entry.source_analyzer or ''} {entry.source_file or ''}".lower()
            text_tokens = set(re.findall(r"\w+", text))

            # 1. Dense Semantic Cosine Similarity
            entry_vec = generate_semantic_embedding(text)
            sim = cosine_similarity(query_vec, entry_vec)

            # 2. Sparse Lexical Token Overlap
            matched = query_tokens.intersection(text_tokens)
            overlap_ratio = len(matched) / max(len(query_tokens), 1)
            density_score = len(matched) / max(len(text_tokens), 1)

            title_boost = 1.5 if any(q in entry.title.lower() for q in query_tokens) else 1.0
            sparse_score = (overlap_ratio * 0.7 + density_score * 0.3) * title_boost

            # 3. Hybrid scoring
            if not matched and sim < 0.15:
                final_score = sim * 0.2
            elif not matched:
                final_score = sim * 0.8 * (0.8 + 0.2 * entry.confidence)
            else:
                final_score = (sim * 0.4 + sparse_score * 0.6) * (0.8 + 0.2 * entry.confidence)

            scored_entries.append(
                ScoredMemoryEntry(
                    entry=entry,
                    score=round(min(1.0, final_score), 4),
                    dense_score=round(sim, 4),
                    sparse_score=round(sparse_score, 4),
                    matched_terms=sorted(matched),
                    retrieval_mode="hybrid_rrf",
                )
            )

        scored_entries.sort(key=lambda s: s.score, reverse=True)
        return scored_entries[:limit]
