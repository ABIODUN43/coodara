from pathlib import Path

from app.analyzers.context import RepositoryContext
from app.analyzers.default_analyzer import DefaultAnalyzer


def _context(tmp_path: Path) -> RepositoryContext:
    return RepositoryContext(
        root_path=tmp_path,
        repository_id="test-repository",
    )


def test_default_analyzer_combines_all_analyzers(
    tmp_path: Path,
) -> None:
    (tmp_path / "main.py").write_text(
        "from fastapi import FastAPI\n\n"
        "app = FastAPI()\n",
        encoding="utf-8",
    )

    result = DefaultAnalyzer().analyze(
        _context(tmp_path),
    )

    assert result.metrics.files == 1
    assert result.metrics.loc > 0

    technologies = {
        technology.technology
        for technology in result.technologies
    }

    assert "Python" in technologies
    assert result.dependency_graph is not None


def test_default_analyzer_is_deterministic(
    tmp_path: Path,
) -> None:
    (tmp_path / "main.py").write_text(
        "import os\n\n"
        "def run():\n"
        "    return os.getcwd()\n",
        encoding="utf-8",
    )

    analyzer = DefaultAnalyzer()
    context = _context(tmp_path)

    first = analyzer.analyze(context)
    second = analyzer.analyze(context)

    assert first == second


def test_default_analyzer_has_canonical_name() -> None:
    assert DefaultAnalyzer.name == "default"