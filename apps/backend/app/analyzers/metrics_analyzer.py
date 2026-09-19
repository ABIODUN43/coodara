"""
Repository metrics analyzer.

Analyzes deterministic repository-level source metrics:
- Discovers supported source files safely.
- Enforces file size and file count bounds.
- Guards against symlink escapes and binary files.
- Counts source lines, classes, and functions/methods via AST.
"""

from __future__ import annotations

import ast
import os
from pathlib import Path

from app.core.config import settings

from .context import RepositoryContext
from .exceptions import AnalyzerExecutionError
from .models import RepositoryMetricsSnapshot


class MetricsAnalyzer:
    """
    Analyze deterministic repository-level source metrics.
    """

    name = "metrics"

    _SUPPORTED_EXTENSIONS = frozenset(
        {
            ".py",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            ".mjs",
            ".cjs",
            ".go",
            ".rs",
            ".java",
            ".scala",
            ".sc",
            ".cs",
            ".cpp",
            ".cc",
            ".cxx",
            ".c",
            ".h",
            ".hpp",
            ".rb",
            ".php",
            ".swift",
            ".kt",
            ".kts",
            ".sql",
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
            ".nox",
            "dist",
            "build",
            "coverage",
            ".coverage",
            ".next",
            ".nuxt",
            "target",
            "vendor",
            ".gradle",
            "bin",
            "obj",
            "kafkatest",
            "fixtures",
            "test-fixtures",
            "site-docs",
        }
    )

    def analyze(
        self,
        context: RepositoryContext,
    ) -> RepositoryMetricsSnapshot:
        """
        Analyze supported source files in the repository.
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
            ext = source_file.suffix.lower()

            if ext == ".py":
                class_count, function_count = self._analyze_python_file(
                    source_file
                )
                classes += class_count
                functions += function_count
            elif ext in {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}:
                class_count, function_count = self._analyze_js_ts_file(
                    source_file
                )
                classes += class_count
                functions += function_count
            elif ext in {
                ".java",
                ".scala",
                ".sc",
                ".go",
                ".rs",
                ".cs",
                ".cpp",
                ".cc",
                ".cxx",
                ".c",
                ".h",
                ".hpp",
                ".kt",
                ".kts",
                ".swift",
                ".rb",
                ".php",
            }:
                class_count, function_count = self._analyze_c_family_file(
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
        Return supported source files below the repository root safely and fast.
        """
        resolved_root = root_path.resolve()
        source_files: list[Path] = []
        max_file_size = settings.ANALYSIS_MAX_FILE_SIZE_BYTES
        max_files_count = settings.ANALYSIS_MAX_FILES_COUNT

        for root, dirnames, filenames in os.walk(root_path):
            # Prune ignored directories in-place to avoid wasting time traversing them
            dirnames[:] = [
                d for d in dirnames
                if d not in self._IGNORED_DIRECTORIES and not d.startswith(".")
            ]

            for filename in filenames:
                if len(source_files) >= max_files_count:
                    break

                path = Path(root) / filename
                if path.suffix.lower() not in self._SUPPORTED_EXTENSIONS:
                    continue

                try:
                    resolved_path = path.resolve()
                    if not resolved_path.is_relative_to(resolved_root):
                        continue
                    if path.stat().st_size > max_file_size:
                        continue
                except (ValueError, OSError):
                    continue

                source_files.append(path)

            if len(source_files) >= max_files_count:
                break

        source_files.sort()
        return source_files

    @staticmethod
    def _count_lines(path: Path) -> int:
        """
        Count physical lines in a source file safely.
        """
        try:
            with path.open(
                "r",
                encoding="utf-8",
                errors="replace",
            ) as source:
                return sum(1 for _ in source)
        except (OSError, UnicodeError):
            return 0

    @staticmethod
    def _analyze_python_file(
        path: Path,
    ) -> tuple[int, int]:
        """
        Count classes and functions/methods in a Python source file using AST.
        """
        try:
            source = path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            return 0, 0

        try:
            tree = ast.parse(
                source,
                filename=str(path),
            )
        except (SyntaxError, ValueError, RecursionError):
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

    @staticmethod
    def _analyze_js_ts_file(
        path: Path,
    ) -> tuple[int, int]:
        """
        Heuristic class and function counts for JS/TS source files.
        """
        try:
            source = path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            return 0, 0

        classes = 0
        functions = 0

        for line in source.splitlines():
            s = line.strip()
            if not s or s.startswith("//") or s.startswith("/*") or s.startswith("*"):
                continue
            if s.startswith("class ") or " class " in s:
                classes += 1
            elif (
                s.startswith("function ")
                or " function " in s
                or "=>" in s
                or s.startswith("async function ")
            ):
                functions += 1

        return classes, functions

    @staticmethod
    def _analyze_c_family_file(
        path: Path,
    ) -> tuple[int, int]:
        """
        Heuristic class and function counts for Java, Scala, Go, Rust, C#, C/C++, Kotlin, Swift.
        """
        try:
            source = path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            return 0, 0

        classes = 0
        functions = 0

        for line in source.splitlines():
            s = line.strip()
            if not s or s.startswith("//") or s.startswith("/*") or s.startswith("*"):
                continue
            if (
                s.startswith("class ") or " class " in s or
                s.startswith("interface ") or " interface " in s or
                s.startswith("trait ") or " trait " in s or
                s.startswith("struct ") or " struct " in s or
                s.startswith("enum ") or " enum " in s or
                s.startswith("record ") or " record " in s or
                s.startswith("type ") and " struct" in s
            ):
                classes += 1
            elif (
                s.startswith("def ") or " def " in s or
                s.startswith("func ") or " func " in s or
                s.startswith("fn ") or " fn " in s or
                (s.startswith("public ") or s.startswith("private ") or s.startswith("protected ")) and "(" in s and ")" in s
            ):
                functions += 1

        return classes, functions