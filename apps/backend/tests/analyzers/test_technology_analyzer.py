from pathlib import Path

from app.analyzers.context import RepositoryContext
from app.analyzers.models import TechnologySnapshot
from app.analyzers.technology_analyzer import TechnologyAnalyzer


def _context(path: Path) -> RepositoryContext:
    return RepositoryContext(
        root_path=path,
        repository_id="test-repository",
    )


def _technologies(
    result: tuple[TechnologySnapshot, ...],
) -> set[str]:
    return {
        item.technology
        for item in result
    }


def test_detects_python_and_fastapi(
    tmp_path: Path,
) -> None:
    (tmp_path / "pyproject.toml").write_text(
        """
[project]
name = "example"

dependencies = [
    "fastapi>=0.115.0",
    "pydantic>=2.0",
]
""",
        encoding="utf-8",
    )

    (tmp_path / "main.py").write_text(
        "from fastapi import FastAPI\n",
        encoding="utf-8",
    )

    result = TechnologyAnalyzer().analyze(
        _context(tmp_path),
    )

    technologies = _technologies(result)

    assert "Python" in technologies
    assert "FastAPI" in technologies
    assert "Pydantic" in technologies


def test_detects_react_typescript_and_pnpm(
    tmp_path: Path,
) -> None:
    (tmp_path / "package.json").write_text(
        """
{
  "name": "frontend",
  "packageManager": "pnpm@10.12.1",
  "dependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vite": "^7.0.0"
  }
}
""",
        encoding="utf-8",
    )

    (tmp_path / "pnpm-lock.yaml").write_text(
        "lockfileVersion: '9.0'\n",
        encoding="utf-8",
    )

    result = TechnologyAnalyzer().analyze(
        _context(tmp_path),
    )

    technologies = _technologies(result)

    assert "Node.js" in technologies
    assert "React" in technologies
    assert "TypeScript" in technologies
    assert "Vite" in technologies
    assert "pnpm" in technologies


def test_detects_docker(
    tmp_path: Path,
) -> None:
    (tmp_path / "Dockerfile").write_text(
        "FROM python:3.13-slim\n",
        encoding="utf-8",
    )

    result = TechnologyAnalyzer().analyze(
        _context(tmp_path),
    )

    technologies = _technologies(result)

    assert "Docker" in technologies


def test_ignores_generated_directories(
    tmp_path: Path,
) -> None:
    generated = tmp_path / "node_modules"
    generated.mkdir()

    (generated / "generated.py").write_text(
        "class Generated:\n    pass\n",
        encoding="utf-8",
    )

    result = TechnologyAnalyzer().analyze(
        _context(tmp_path),
    )

    assert "Python" not in _technologies(result)


def test_handles_malformed_package_json(
    tmp_path: Path,
) -> None:
    (tmp_path / "package.json").write_text(
        "{ invalid json",
        encoding="utf-8",
    )

    result = TechnologyAnalyzer().analyze(
        _context(tmp_path),
    )

    assert isinstance(result, tuple)


def test_result_is_deterministic(
    tmp_path: Path,
) -> None:
    (tmp_path / "app.py").write_text(
        "print('hello')\n",
        encoding="utf-8",
    )

    (tmp_path / "package.json").write_text(
        """
{
  "dependencies": {
    "react": "^19.0.0"
  }
}
""",
        encoding="utf-8",
    )

    analyzer = TechnologyAnalyzer()

    first = analyzer.analyze(
        _context(tmp_path),
    )

    second = analyzer.analyze(
        _context(tmp_path),
    )

    assert first == second