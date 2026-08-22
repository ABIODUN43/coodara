from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .base import Analyzer
from .context import RepositoryContext
from .exceptions import AnalyzerExecutionError


@dataclass(frozen=True, slots=True)
class AnalysisRun:
    """Results produced by a complete analyzer run."""

    results: tuple[Any, ...]


class AnalysisOrchestrator:
    """Coordinates execution of repository analyzers."""

    def __init__(
        self,
        analyzers: tuple[Analyzer[Any], ...],
    ) -> None:
        self._analyzers = analyzers

    def analyze(
        self,
        context: RepositoryContext,
    ) -> AnalysisRun:
        results: list[Any] = []

        for analyzer in self._analyzers:
            try:
                result = analyzer.analyze(context)
            except Exception as exc:
                raise AnalyzerExecutionError(
                    f"Analyzer '{analyzer.name}' failed"
                ) from exc

            results.append(result)

        return AnalysisRun(results=tuple(results))