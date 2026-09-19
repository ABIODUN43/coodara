"""
Tests for Hybrid Vector & Dense-Sparse RRF Memory Retriever (Silicon Valley Standard).
"""

import pytest
from app.ai.memory.embeddings import (
    cosine_similarity,
    generate_semantic_embedding,
)
from app.ai.memory.retriever import ArchitectureMemoryRetriever
from app.models.memory import ArchitectureMemoryEntry, MemoryType


def test_semantic_embeddings_generation_and_cosine_similarity():
    v_auth = generate_semantic_embedding("JWT authentication token security handler")
    v_login = generate_semantic_embedding("OAuth bearer session authorization")
    v_db = generate_semantic_embedding("PostgreSQL relational database schema migration")

    sim_auth_login = cosine_similarity(v_auth, v_login)
    sim_auth_db = cosine_similarity(v_auth, v_db)

    # Auth and Login should have high semantic similarity, higher than Auth and DB
    assert sim_auth_login > sim_auth_db
    assert sim_auth_login > 0.40


def test_hybrid_rrf_retriever_ranking():
    retriever = ArchitectureMemoryRetriever()

    entries = [
        ArchitectureMemoryEntry(
            id=1,
            memory_id=10,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_PATTERN,
            title="Layered Modular Domain Service",
            content="Application services coordinate domain models and isolate database persistence adapters.",
            confidence=0.95,
            source_analyzer="AST Engine",
        ),
        ArchitectureMemoryEntry(
            id=2,
            memory_id=10,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_DECISION,
            title="Redis Asynchronous Celery Queue",
            content="Use Redis broker for background worker task queues and cache memoization.",
            confidence=0.90,
            source_analyzer="Manifest Scanner",
        ),
        ArchitectureMemoryEntry(
            id=3,
            memory_id=10,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_CONSTRAINT,
            title="Hexagonal Domain Purity Constraint",
            content="Domain entities must not import external HTTP clients or SQLAlchemy sessions directly.",
            confidence=1.0,
            source_analyzer="Architecture Auditor",
        ),
    ]

    # Query without exact keyword match ("background tasks and workers")
    scored = retriever.rank_entries(entries=entries, query="background tasks and worker queue", limit=3)

    assert len(scored) == 3
    # Top ranked should be Redis Celery entry
    assert scored[0].entry.id == 2
    assert scored[0].dense_score > 0.3
    assert scored[0].retrieval_mode == "hybrid_rrf"


def test_empty_query_fallback_to_confidence():
    retriever = ArchitectureMemoryRetriever()
    entries = [
        ArchitectureMemoryEntry(
            id=1,
            memory_id=10,
            organization_id=1,
            repository_id=1,
            analysis_id=1,
            memory_type=MemoryType.ARCHITECTURE_FACT,
            title="Sample Fact",
            content="Sample text",
            confidence=0.88,
        )
    ]
    scored = retriever.rank_entries(entries=entries, query="")
    assert len(scored) == 1
    assert scored[0].score == 0.88
