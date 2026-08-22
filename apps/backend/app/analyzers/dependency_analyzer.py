"""
Dependency analysis for repository modules.

The dependency analyzer is responsible for extracting explicit module
dependencies from supported source files and producing a deterministic
dependency graph snapshot.

Supported languages:
- Python
- JavaScript
- TypeScript

The analyzer deliberately does not:
- Resolve package-manager dependencies.
- Execute repository code.
- Access GitHub.
- Perform database operations.
- Apply architecture/business rules.

Those concerns belong to higher layers of the analysis engine.
"""

from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass
from pathlib import Path

from app.analyzers.context import RepositoryContext
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.models import DependencyGraphSnapshot


@dataclass(frozen=True, slots=True)
class _DependencyEdge:
    """Internal representation of one dependency relationship."""

    source: str
    target: str
    kind: str


class DependencyAnalyzer:
    """
    Extract module-level dependencies from a repository.

    The output is deterministic:
    - Files are processed in lexical order.
    - Nodes are sorted.
    - Edges are sorted.
    - Duplicate edges are removed.

    Currently supported:
    - Python imports.
    - JavaScript imports/requires.
    - TypeScript imports/requires.
    """

    name = "dependency"

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
            ".pytest_cache",
            ".mypy_cache",
            ".ruff_cache",
            "dist",
            "build",
            "coverage",
            ".next",
            ".nuxt",
            "target",
            "vendor",
        }
    )

    _SOURCE_EXTENSIONS = frozenset(
        {
            ".py",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
        }
    )

    _JS_IMPORT_PATTERN = re.compile(
        r"""
        (?:
            import\s+(?:
                [^;]*?\s+from\s+
            )?
            |
            export\s+[^;]*?\s+from\s+
            |
            require\s*\(\s*
            |
            import\s*\(\s*
        )
        (?P<quote>["'])
        (?P<module>[^"']+)
        (?P=quote)
        """,
        re.VERBOSE,
    )

    def analyze(
        self,
        context: RepositoryContext,
    ) -> DependencyGraphSnapshot:
        """
        Analyze the repository and return a deterministic dependency graph.
        """

        try:
            files = self._collect_source_files(context.root_path)

            nodes = {
                self._relative_path(
                    path,
                    context.root_path,
                )
                for path in files
            }

            edges: set[_DependencyEdge] = set()

            for path in files:
                relative_source = self._relative_path(
                    path,
                    context.root_path,
                )

                if path.suffix == ".py":
                    dependencies = self._extract_python_dependencies(
                        path,
                    )
                else:
                    dependencies = self._extract_javascript_dependencies(
                        path,
                    )

                for dependency, kind in dependencies:
                    edges.add(
                        _DependencyEdge(
                            source=relative_source,
                            target=dependency,
                            kind=kind,
                        )
                    )

            graph = {
                "version": 1,
                "nodes": [
                    {
                        "id": node,
                        "type": "module",
                    }
                    for node in sorted(nodes)
                ],
                "edges": [
                    {
                        "source": edge.source,
                        "target": edge.target,
                        "kind": edge.kind,
                    }
                    for edge in sorted(
                        edges,
                        key=lambda item: (
                            item.source,
                            item.target,
                            item.kind,
                        ),
                    )
                ],
            }

            return DependencyGraphSnapshot(
                graph_data=json.dumps(
                    graph,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                )
            )

        except AnalyzerExecutionError:
            raise

        except OSError as exc:
            raise AnalyzerExecutionError(
                f"Unable to read repository at {context.root_path}",
            ) from exc

        except Exception as exc:
            raise AnalyzerExecutionError(
                "Dependency analysis failed.",
            ) from exc

    def _collect_source_files(
        self,
        root_path: Path,
    ) -> list[Path]:
        """
        Collect supported source files while excluding generated/vendor data.
        """

        files: list[Path] = []

        for path in root_path.rglob("*"):
            if not path.is_file():
                continue

            if path.suffix.lower() not in self._SOURCE_EXTENSIONS:
                continue

            if self._is_ignored(path, root_path):
                continue

            files.append(path)

        return sorted(files)

    def _is_ignored(
        self,
        path: Path,
        root_path: Path,
    ) -> bool:
        """
        Return whether a path belongs to an ignored directory.
        """

        try:
            relative = path.relative_to(root_path)
        except ValueError:
            return True

        return any(
            part in self._IGNORED_DIRECTORIES
            for part in relative.parts[:-1]
        )

    def _extract_python_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """
        Extract Python import dependencies.

        Syntax errors are ignored for the individual file so that one
        malformed source file cannot prevent repository-wide analysis.
        """

        try:
            source = path.read_text(
                encoding="utf-8",
            )
        except (OSError, UnicodeDecodeError):
            return []

        try:
            tree = ast.parse(
                source,
                filename=str(path),
            )
        except SyntaxError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dependencies.add(
                        (
                            alias.name,
                            "import",
                        )
                    )

            elif isinstance(node, ast.ImportFrom):
                module = self._build_python_import_from(node)

                if module:
                    dependencies.add(
                        (
                            module,
                            "import",
                        )
                    )

        return sorted(dependencies)

    def _build_python_import_from(
        self,
        node: ast.ImportFrom,
    ) -> str | None:
        """
        Build a normalized representation of a Python from-import.
        """

        module = node.module or ""

        if node.level == 0:
            return module or None

        relative_prefix = "." * node.level

        if module:
            return f"{relative_prefix}{module}"

        return relative_prefix

    def _extract_javascript_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """
        Extract JavaScript/TypeScript module references.

        This intentionally records the imported module specifier rather
        than attempting filesystem/package resolution.
        """

        try:
            source = path.read_text(
                encoding="utf-8",
            )
        except (OSError, UnicodeDecodeError):
            return []

        dependencies: set[tuple[str, str]] = set()

        for match in self._JS_IMPORT_PATTERN.finditer(source):
            module = match.group("module").strip()

            if not module:
                continue

            dependencies.add(
                (
                    module,
                    "import",
                )
            )

        return sorted(dependencies)

    @staticmethod
    def _relative_path(
        path: Path,
        root_path: Path,
    ) -> str:
        """
        Convert a repository path into a stable POSIX-style path.
        """

        return path.relative_to(root_path).as_posix()