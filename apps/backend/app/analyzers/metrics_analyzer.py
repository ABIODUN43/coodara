"""
Repository metrics analyzer.

This module contains deterministic, read-only analysis logic for
repository-level source metrics.

Responsibilities:
- Discover supported source files.
- Count source lines.
- Count classes.
- Count functions/methods.
- Produce a RepositoryMetricsSnapshot.

Non-responsibilities:
- Database persistence.
- GitHub API calls.
- Repository cloning.
- FastAPI concerns.
- LLM/AI processing.
- Mutating the analyzed repository.
"""

from __future__ import annotations

import ast
from pathlib import Path

from .context import RepositoryContext
from .exceptions import AnalyzerExecutionError
from .models import RepositoryMetricsSnapshot


class MetricsAnalyzer:
    """
    Analyze deterministic repository-level source metrics.

    The analyzer is intentionally conservative. Unsupported or
    unparseable source files do not cause the entire repository
    analysis to fail; they are skipped.
    """

    name = "metrics"

    _SUPPORTED_EXTENSIONS = frozenset(
        {
            ".py",
        }
    )

    _IGNORED_DIRECTORIES = frozenset(
        {
            ".git",
            ".hg",
            ".svn",
            ".venv",
            "venv",
            "env",
            "node_modules",
            "__pycache__",
            ".mypy_cache",
            ".pytest_cache",
            ".ruff_cache",
            ".tox",
            "dist",
            "build",
            "coverage",
            ".coverage",
        }
    )

    def analyze(
        self,
        context: RepositoryContext,
    ) -> RepositoryMetricsSnapshot:
        """
        Analyze supported source files in the repository.

        The repository is never modified.

        Returns:
            RepositoryMetricsSnapshot containing deterministic metrics.

        Raises:
            AnalyzerExecutionError:
                If the repository cannot be traversed.
        """

        try:
            source_files = tuple(
                self._iter_source_files(context.root_path)
            )
        except OSError as exc:
            raise AnalyzerExecutionError(
                "Unable to scan repository for source files."
            ) from exc

        loc = 0
        classes = 0
        functions = 0

        for source_file in source_files:
            loc += self._count_lines(source_file)

            if source_file.suffix == ".py":
                class_count, function_count = self._analyze_python_file(
                    source_file
                )
                classes += class_count
                functions += function_count

        return RepositoryMetricsSnapshot(
            loc=loc,
            files=len(source_files),
            classes=classes,
            functions=functions,
            complexity=None,
            maintainability=None,
        )

    def _iter_source_files(
        self,
        root_path: Path,
    ) -> list[Path]:
        """
        Return supported source files below the repository root.

        Ignored directories are excluded before recursion.
        """

        source_files: list[Path] = []

        for path in root_path.rglob("*"):
            if not path.is_file():
                continue

            if self._is_ignored(path, root_path):
                continue

            if path.suffix.lower() not in self._SUPPORTED_EXTENSIONS:
                continue

            source_files.append(path)

        source_files.sort()

        return source_files

    def _is_ignored(
        self,
        path: Path,
        root_path: Path,
    ) -> bool:
        """
        Determine whether a repository path belongs to an ignored tree.
        """

        try:
            relative_path = path.relative_to(root_path)
        except ValueError:
            return True

        return any(
            part in self._IGNORED_DIRECTORIES
            for part in relative_path.parts
        )

    @staticmethod
    def _count_lines(path: Path) -> int:
        """
        Count physical lines in a source file.

        A physical line is counted exactly once, including blank lines.
        """

        try:
            with path.open(
                "r",
                encoding="utf-8",
                errors="replace",
            ) as source:
                return sum(1 for _ in source)
        except OSError as exc:
            raise AnalyzerExecutionError(
                f"Unable to read source file: {path}"
            ) from exc

    @staticmethod
    def _analyze_python_file(
        path: Path,
    ) -> tuple[int, int]:
        """
        Count classes and functions/methods in a Python source file.

        AST parsing gives us structural information without executing
        repository code.
        """

        try:
            source = path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError as exc:
            raise AnalyzerExecutionError(
                f"Unable to read Python source file: {path}"
            ) from exc

        try:
            tree = ast.parse(
                source,
                filename=str(path),
            )
        except SyntaxError:
            # A malformed source file should not invalidate the entire
            # repository analysis.
            return 0, 0

        classes = 0
        functions = 0

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                classes += 1
            elif isinstance(
                node,
                (
                    ast.FunctionDef,
                    ast.AsyncFunctionDef,
                ),
            ):
                functions += 1

        return classes, functions