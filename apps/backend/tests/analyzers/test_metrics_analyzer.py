from pathlib import Path

from app.analyzers.context import RepositoryContext
from app.analyzers.metrics_analyzer import MetricsAnalyzer


def _context(tmp_path: Path) -> RepositoryContext:
    return RepositoryContext(
        root_path=tmp_path,
        repository_id="repository-1",
    )


def test_metrics_analyzer_counts_python_files(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.py").write_text(
        "class User:\n"
        "    def create(self):\n"
        "        return True\n",
        encoding="utf-8",
    )

    (tmp_path / "service.py").write_text(
        "def run():\n"
        "    return True\n",
        encoding="utf-8",
    )

    result = MetricsAnalyzer().analyze(
        _context(tmp_path),
    )

    assert result.files == 2
    assert result.classes == 1
    assert result.functions == 2
    assert result.loc == 5


def test_metrics_analyzer_ignores_generated_directories(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.py").write_text(
        "def run():\n"
        "    return True\n",
        encoding="utf-8",
    )

    ignored = tmp_path / ".venv"
    ignored.mkdir()

    (ignored / "fake.py").write_text(
        "class Fake:\n"
        "    pass\n",
        encoding="utf-8",
    )

    result = MetricsAnalyzer().analyze(
        _context(tmp_path),
    )

    assert result.files == 1
    assert result.classes == 0
    assert result.functions == 1


def test_metrics_analyzer_handles_syntax_errors(
    tmp_path: Path,
) -> None:
    (tmp_path / "valid.py").write_text(
        "def valid():\n"
        "    return True\n",
        encoding="utf-8",
    )

    (tmp_path / "invalid.py").write_text(
        "def broken(:\n",
        encoding="utf-8",
    )

    result = MetricsAnalyzer().analyze(
        _context(tmp_path),
    )

    assert result.files == 2
    assert result.functions == 1
    assert result.classes == 0


def test_metrics_analyzer_is_deterministic(
    tmp_path: Path,
) -> None:
    (tmp_path / "b.py").write_text(
        "def second():\n"
        "    return 2\n",
        encoding="utf-8",
    )

    (tmp_path / "a.py").write_text(
        "class First:\n"
        "    def first(self):\n"
        "        return 1\n",
        encoding="utf-8",
    )

    analyzer = MetricsAnalyzer()

    first = analyzer.analyze(_context(tmp_path))
    second = analyzer.analyze(_context(tmp_path))

    assert first == second