from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from app.analysis.execution import (
    AnalysisExecutionError,
    AnalysisExecutionService,
    AnalysisJobNotFoundError,
)
from app.analysis.workspace import RepositoryWorkspaceError
from app.analyzers.models import (
    AnalysisSnapshot,
    DependencyGraphSnapshot,
    RepositoryMetricsSnapshot,
    TechnologySnapshot,
)
from app.models.analysis import AnalysisJob, AnalysisStatus


def _snapshot() -> AnalysisSnapshot:
    return AnalysisSnapshot(
        summary="Repository analysis completed.",
        metrics=RepositoryMetricsSnapshot(
            loc=100,
            files=5,
            classes=2,
            functions=10,
            complexity=4.5,
            maintainability=82.0,
        ),
        technologies=(
            TechnologySnapshot(
                technology="Python",
                version="3.13",
                confidence_score=0.99,
            ),
            TechnologySnapshot(
                technology="FastAPI",
                version="0.115",
                confidence_score=0.95,
            ),
        ),
        dependency_graph=DependencyGraphSnapshot(
            graph_data='{"nodes": [], "edges": []}',
        ),
    )


def _repository() -> MagicMock:
    repository = MagicMock()

    repository.id = 10
    repository.clone_url = "https://github.com/example/repository.git"
    repository.default_branch = "main"

    return repository


def _job(
    *,
    status: AnalysisStatus = AnalysisStatus.PENDING,
) -> AnalysisJob:
    job = MagicMock(spec=AnalysisJob)

    job.id = 1
    job.repository_id = 10
    job.status = status
    job.progress = 0
    job.started_at = None
    job.completed_at = None
    job.error_message = None

    return job


@pytest.fixture
def db() -> AsyncMock:
    return AsyncMock()


@pytest.fixture
def orchestrator() -> MagicMock:
    return MagicMock()


@pytest.fixture
def service(
    db: AsyncMock,
    orchestrator: MagicMock,
) -> AnalysisExecutionService:
    return AnalysisExecutionService(
        db=db,
        orchestrator=orchestrator,
    )


@pytest.mark.asyncio
async def test_execute_rejects_missing_job(
    service: AnalysisExecutionService,
) -> None:
    service.analysis_repository.get_by_id = AsyncMock(
        return_value=None,
    )

    with pytest.raises(AnalysisJobNotFoundError):
        await service.execute(analysis_id=999)


@pytest.mark.asyncio
async def test_execute_rejects_completed_job(
    service: AnalysisExecutionService,
) -> None:
    job = _job(status=AnalysisStatus.COMPLETED)

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    with pytest.raises(AnalysisExecutionError, match="cannot be executed"):
        await service.execute(analysis_id=job.id)


@pytest.mark.asyncio
async def test_execute_rejects_failed_job(
    service: AnalysisExecutionService,
) -> None:
    job = _job(status=AnalysisStatus.FAILED)

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    with pytest.raises(AnalysisExecutionError, match="cannot be executed"):
        await service.execute(analysis_id=job.id)


@pytest.mark.asyncio
async def test_execute_marks_job_failed_when_repository_missing(
    service: AnalysisExecutionService,
) -> None:
    job = _job()

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    service.repository_repository.get_by_id = AsyncMock(
        return_value=None,
    )

    service.analysis_repository.update = AsyncMock()

    with pytest.raises(
        AnalysisExecutionError,
        match="Repository for analysis job no longer exists",
    ):
        await service.execute(analysis_id=job.id)

    assert job.status == AnalysisStatus.FAILED
    assert job.progress == 100
    assert job.error_message == "Repository no longer exists."
    assert job.completed_at is not None


@pytest.mark.asyncio
async def test_execute_transitions_job_to_running_and_completed(
    service: AnalysisExecutionService,
    orchestrator: MagicMock,
    tmp_path: Path,
) -> None:
    job = _job()
    repository = _repository()

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    service.repository_repository.get_by_id = AsyncMock(
        return_value=repository,
    )

    service.analysis_repository.update = AsyncMock()
    service.analysis_repository.create_result = AsyncMock()
    service.analysis_repository.update_result = AsyncMock()

    orchestrator.analyze.return_value = MagicMock(
        results=(_snapshot(),),
    )

    with patch(
        "app.analysis.execution.RepositoryWorkspace",
    ) as workspace_class:
        workspace = workspace_class.return_value

        repository_path = tmp_path / "repository"
        repository_path.mkdir()

        workspace.repository_path = repository_path

        workspace.__enter__.return_value = workspace
        workspace.__exit__.return_value = None

        result = await service.execute(
            analysis_id=job.id,
        )

    assert result is job

    assert job.status == AnalysisStatus.COMPLETED
    assert job.progress == 100
    assert job.started_at is not None
    assert job.completed_at is not None
    assert job.error_message is None

    orchestrator.analyze.assert_called_once()

    workspace_class.assert_called_once_with(
        clone_url=repository.clone_url,
        branch=repository.default_branch,
    )

    service.analysis_repository.create_result.assert_called_once()
    service.analysis_repository.update_result.assert_called_once()


@pytest.mark.asyncio
async def test_execute_persists_analysis_snapshot(
    service: AnalysisExecutionService,
    orchestrator: MagicMock,
    tmp_path: Path,
) -> None:
    job = _job()
    repository = _repository()
    snapshot = _snapshot()

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    service.repository_repository.get_by_id = AsyncMock(
        return_value=repository,
    )

    service.analysis_repository.update = AsyncMock()

    created_result = MagicMock()
    created_result.id = 55
    created_result.metrics = None
    created_result.technologies = []

    service.analysis_repository.create_result = AsyncMock(
        side_effect=lambda result: _attach_result_id(
            result,
            created_result,
        ),
    )

    service.analysis_repository.update_result = AsyncMock()

    orchestrator.analyze.return_value = MagicMock(
        results=(snapshot,),
    )

    with patch(
        "app.analysis.execution.RepositoryWorkspace",
    ) as workspace_class:
        workspace = workspace_class.return_value

        repository_path = tmp_path / "repository"
        repository_path.mkdir()

        workspace.repository_path = repository_path
        workspace.__enter__.return_value = workspace
        workspace.__exit__.return_value = None

        await service.execute(analysis_id=job.id)

    persisted_result = (
        service.analysis_repository.create_result
        .await_args.args[0]
    )

    assert persisted_result.analysis_job_id == job.id
    assert persisted_result.summary == snapshot.summary

    assert persisted_result.metrics.loc == 100
    assert persisted_result.metrics.files == 5
    assert persisted_result.metrics.classes == 2
    assert persisted_result.metrics.functions == 10
    assert persisted_result.metrics.complexity == 4.5
    assert persisted_result.metrics.maintainability == 82.0

    assert len(persisted_result.technologies) == 2
    assert persisted_result.technologies[0].technology == "Python"
    assert persisted_result.technologies[1].technology == "FastAPI"

    assert persisted_result.dependency_graph.graph_data == (
        '{"nodes": [], "edges": []}'
    )


@pytest.mark.asyncio
async def test_execute_marks_job_failed_when_workspace_fails(
    service: AnalysisExecutionService,
) -> None:
    job = _job()
    repository = _repository()

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    service.repository_repository.get_by_id = AsyncMock(
        return_value=repository,
    )

    service.analysis_repository.update = AsyncMock()

    with patch(
        "app.analysis.execution.RepositoryWorkspace",
    ) as workspace_class:
        workspace_class.side_effect =  RepositoryWorkspaceError(
        "clone failed internally",
    )

        with pytest.raises(
            AnalysisExecutionError,
            match="Repository analysis failed",
        ):
            await service.execute(analysis_id=job.id)

    assert job.status == AnalysisStatus.FAILED
    assert job.progress == 100
    assert job.completed_at is not None
    assert job.error_message == (
        "clone failed internally"
    )


@pytest.mark.asyncio
async def test_execute_rejects_multiple_analysis_snapshots(
    service: AnalysisExecutionService,
    orchestrator: MagicMock,
     tmp_path: Path,
) -> None:
    job = _job()
    repository = _repository()

    service.analysis_repository.get_by_id = AsyncMock(
        return_value=job,
    )

    service.repository_repository.get_by_id = AsyncMock(
        return_value=repository,
    )

    service.analysis_repository.update = AsyncMock()

    orchestrator.analyze.return_value = MagicMock(
        results=(
            _snapshot(),
            _snapshot(),
        ),
    )

    with patch(
        "app.analysis.execution.RepositoryWorkspace",
    ) as workspace_class:
        workspace = workspace_class.return_value

        repository_path = tmp_path / "repository"
        repository_path.mkdir()

        workspace.repository_path = repository_path
        workspace.__enter__.return_value = workspace
        workspace.__exit__.return_value = None

        with pytest.raises(
            AnalysisExecutionError,
            match="exactly one AnalysisSnapshot",
        ):
            await service.execute(analysis_id=job.id)

    assert job.status == AnalysisStatus.FAILED
    assert job.progress == 100


def _attach_result_id(
    result,
    created_result,
):
    result.id = created_result.id

    # The production code assigns relationships directly.
    # Ensure the test object supports the same behavior.
    result.metrics = None
    result.technologies = []
    result.dependency_graph = None

    return result