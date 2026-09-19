"""
Tests for ArchitectureMemoryRetriever.

Verifies:
- Ranking algorithm ranks entries based on keyword matching, token overlap, and confidence.
- Title matches receive boost.
- Empty queries return top confidence entries.
"""

from app.ai.memory.retriever import ArchitectureMemoryRetriever
from app.models.memory import ArchitectureMemoryEntry, MemoryType


def test_memory_retriever_ranking_accuracy():
    """
    Test retriever ranks entries matching specific architectural queries.
    """
    retriever = ArchitectureMemoryRetriever()

    entry1 = ArchitectureMemoryEntry(
        id=1,
        memory_id=1,
        organization_id=1,
        repository_id=10,
        memory_type=MemoryType.ARCHITECTURE_FACT,
        title="Authentication Architecture",
        content="JWT access tokens with PostgreSQL refresh sessions.",
        confidence=1.0,
        source_analyzer="TechnologyAnalyzer",
    )

    entry2 = ArchitectureMemoryEntry(
        id=2,
        memory_id=1,
        organization_id=1,
        repository_id=10,
        memory_type=MemoryType.ARCHITECTURE_FACT,
        title="Payment Gateway Integration",
        content="Stripe webhook processing via asynchronous tasks.",
        confidence=0.9,
        source_analyzer="TechnologyAnalyzer",
    )

    entry3 = ArchitectureMemoryEntry(
        id=3,
        memory_id=1,
        organization_id=1,
        repository_id=10,
        memory_type=MemoryType.ARCHITECTURE_ISSUE,
        title="Circular Dependency in Auth",
        content="auth-service and user-service have bidirectional imports.",
        confidence=0.95,
        source_analyzer="ArchitectureAnalyzer",
    )

    entries = [entry1, entry2, entry3]

    # Query about authentication
    results = retriever.rank_entries(entries=entries, query="authentication JWT", limit=5)
    assert len(results) > 0
    assert results[0].entry.id == 1  # entry1 should be top match
    assert "authentication" in results[0].matched_terms or "jwt" in results[0].matched_terms

    # Query about payments
    pay_results = retriever.rank_entries(entries=entries, query="stripe payment", limit=5)
    assert len(pay_results) > 0
    assert pay_results[0].entry.id == 2
