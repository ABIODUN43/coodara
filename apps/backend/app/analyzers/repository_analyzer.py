"""
Repository analysis engine contract.
"""

from __future__ import annotations

from typing import Protocol

from app.analyzers.context import RepositoryContext
from app.analyzers.models import AnalysisSnapshot


class RepositoryAnalyzer(Protocol):
    """
    Contract implemented by repository analysis engines.
    """

    name: str

    def analyze(
        self,
        context: RepositoryContext,
    ) -> AnalysisSnapshot:
        """
        Analyze a repository and return an immutable snapshot.
        """
        ...