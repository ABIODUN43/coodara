from dataclasses import dataclass
from pathlib import Path

import pytest
from app.analyzers.base import Analyzer
from app.analyzers.context import RepositoryContext
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.orchestrator import AnalysisOrchestrator


@dataclass(frozen=True)
class FakeResult:
    value: str


class FakeAnalyzer(Analyzer[FakeResult]):
    def __init__(self, name: str, value: str) -> None:
        self._name = name
        self._value = value

    @property
    def name(self) -> str:
        return self._name

    def analyze(
        self,
        context: RepositoryContext,
    ) -> FakeResult:
        return FakeResult(value=self._value)


class FailingAnalyzer(Analyzer[FakeResult]):
    @property
    def name(self) -> str:
        return "failing"

    def analyze(
        self,
        context: RepositoryContext,
    ) -> FakeResult:
        raise RuntimeError("boom")


def test_orchestrator_runs_all_analyzers(
    tmp_path: Path,
) -> None:
    context = RepositoryContext(
        root_path=tmp_path,
        repository_id="repository-123",
    )

    orchestrator = AnalysisOrchestrator(
        analyzers=(
            FakeAnalyzer("first", "one"),
            FakeAnalyzer("second", "two"),
        )
    )

    result = orchestrator.analyze(context)

    assert result.results == (
        FakeResult("one"),
        FakeResult("two"),
    )


def test_orchestrator_preserves_analyzer_order(
    tmp_path: Path,
) -> None:
    context = RepositoryContext(
        root_path=tmp_path,
        repository_id="repository-123",
    )

    orchestrator = AnalysisOrchestrator(
        analyzers=(
            FakeAnalyzer("first", "one"),
            FakeAnalyzer("second", "two"),
            FakeAnalyzer("third", "three"),
        )
    )

    result = orchestrator.analyze(context)

    assert [item.value for item in result.results] == [
        "one",
        "two",
        "three",
    ]


def test_orchestrator_wraps_analyzer_failure(
    tmp_path: Path,
) -> None:
    context = RepositoryContext(
        root_path=tmp_path,
        repository_id="repository-123",
    )

    orchestrator = AnalysisOrchestrator(
        analyzers=(FailingAnalyzer(),),
    )

    with pytest.raises(
        AnalyzerExecutionError,
        match="Analyzer 'failing' failed",
    ) as exc_info:
        orchestrator.analyze(context)

    assert isinstance(exc_info.value.__cause__, RuntimeError)