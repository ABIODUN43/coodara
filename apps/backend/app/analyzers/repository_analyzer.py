"""
Repository analysis engine contracts.
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from app.analyzers.models import AnalysisSnapshot


class RepositoryAnalyzer(Protocol):
    """
    Contract implemented by repository analysis engines.
    """

    async def analyze(
        self,
        repository_path: Path,
    ) -> AnalysisSnapshot:
        """
        Analyze a repository and return an immutable snapshot.
        """
        ...