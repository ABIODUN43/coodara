"""
Multi-Language Dependency Analysis for Repository Modules.

Extracts explicit module and package dependencies, inheritance, and imports
from supported source files across polyglot codebases (Python, Java, Scala, Go, Rust, TS/JS, C/C++, C#).
"""

from __future__ import annotations

import ast
import json
import os
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
    Extract module-level dependencies from a polyglot repository.
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
            ".tox",
            ".nox",
            "dist",
            "build",
            "coverage",
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

    _SOURCE_EXTENSIONS = frozenset(
        {
            ".py",
            ".js",
            ".jsx",
            ".ts",
            ".tsx",
            ".mjs",
            ".cjs",
            ".java",
            ".scala",
            ".sc",
            ".go",
            ".rs",
            ".c",
            ".cpp",
            ".cc",
            ".h",
            ".hpp",
            ".cs",
            ".rb",
            ".php",
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

    _JAVA_IMPORT_PATTERN = re.compile(r"^\s*import\s+(?:static\s+)?([A-Za-z0-9_.*]+)\s*;", re.MULTILINE)
    _JAVA_EXTENDS_PATTERN = re.compile(r"\b(?:class|interface|record)\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_,\s]+)", re.MULTILINE)
    _JAVA_IMPLEMENTS_PATTERN = re.compile(r"\bclass\s+([A-Za-z0-9_]+)[^{]*\bimplements\s+([A-Za-z0-9_,\s]+)", re.MULTILINE)

    _SCALA_IMPORT_PATTERN = re.compile(r"^\s*import\s+([A-Za-z0-9_.*{}]+)", re.MULTILINE)
    _SCALA_EXTENDS_PATTERN = re.compile(r"\b(?:class|object|trait)\s+([A-Za-z0-9_]+)\s+extends\s+([A-Za-z0-9_]+)", re.MULTILINE)
    _SCALA_WITH_PATTERN = re.compile(r"\bwith\s+([A-Za-z0-9_]+)", re.MULTILINE)

    _GO_SINGLE_IMPORT_PATTERN = re.compile(r'^\s*import\s+(?:[A-Za-z0-9_]+\s+)?"([^"]+)"', re.MULTILINE)
    _GO_MULTI_IMPORT_PATTERN = re.compile(r'import\s*\((.*?)\)', re.DOTALL)
    _GO_IMPORT_LINE_PATTERN = re.compile(r'(?:[A-Za-z0-9_]+\s+)?"([^"]+)"')

    _RUST_USE_PATTERN = re.compile(r"^\s*(?:pub\s+)?use\s+([A-Za-z0-9_:]+)", re.MULTILINE)
    _RUST_MOD_PATTERN = re.compile(r"^\s*(?:pub\s+)?mod\s+([A-Za-z0-9_]+)\s*;", re.MULTILINE)

    _CPP_INCLUDE_PATTERN = re.compile(r'^\s*#include\s*[<"]([^>"]+)[>"]', re.MULTILINE)
    _CS_USING_PATTERN = re.compile(r"^\s*using\s+(?:static\s+)?([A-Za-z0-9_.]+)\s*;", re.MULTILINE)

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
            symbol_index = self._build_symbol_index(files, context.root_path)

            for path in files:
                relative_source = self._relative_path(
                    path,
                    context.root_path,
                )

                ext = path.suffix.lower()

                if ext == ".py":
                    dependencies = self._extract_python_dependencies(path)
                elif ext in {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}:
                    dependencies = self._extract_javascript_dependencies(path)
                elif ext == ".java":
                    dependencies = self._extract_java_dependencies(path)
                elif ext in {".scala", ".sc"}:
                    dependencies = self._extract_scala_dependencies(path)
                elif ext == ".go":
                    dependencies = self._extract_go_dependencies(path)
                elif ext == ".rs":
                    dependencies = self._extract_rust_dependencies(path)
                elif ext in {".c", ".cpp", ".cc", ".h", ".hpp"}:
                    dependencies = self._extract_cpp_dependencies(path)
                elif ext == ".cs":
                    dependencies = self._extract_csharp_dependencies(path)
                else:
                    dependencies = []

                for dependency, kind in dependencies:
                    resolved_target = self._resolve_target(
                        target=dependency,
                        source_rel=relative_source,
                        symbol_index=symbol_index,
                    )
                    edges.add(
                        _DependencyEdge(
                            source=relative_source,
                            target=resolved_target,
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
        Collect supported source files safely and fast.
        """
        resolved_root = root_path.resolve()
        files: list[Path] = []
        max_files_count = 15000

        for root, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [
                d for d in dirnames
                if d not in self._IGNORED_DIRECTORIES and not d.startswith(".")
            ]

            for filename in filenames:
                if len(files) >= max_files_count:
                    break

                path = Path(root) / filename
                if path.suffix.lower() not in self._SOURCE_EXTENSIONS:
                    continue

                try:
                    resolved = path.resolve()
                    if not resolved.is_relative_to(resolved_root):
                        continue
                except (ValueError, OSError):
                    continue

                files.append(path)

            if len(files) >= max_files_count:
                break

        return sorted(files)

    def _extract_python_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract Python import dependencies."""
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return []

        try:
            tree = ast.parse(source, filename=str(path))
        except SyntaxError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    dependencies.add((alias.name, "import"))
            elif isinstance(node, ast.ImportFrom):
                module = self._build_python_import_from(node)
                if module:
                    dependencies.add((module, "import"))

        return sorted(dependencies)

    def _build_python_import_from(
        self,
        node: ast.ImportFrom,
    ) -> str | None:
        module = node.module or ""
        if node.level == 0:
            return module or None
        relative_prefix = "." * node.level
        return f"{relative_prefix}{module}" if module else relative_prefix

    def _extract_javascript_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract JavaScript/TypeScript module references."""
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            return []

        dependencies: set[tuple[str, str]] = set()

        for match in self._JS_IMPORT_PATTERN.finditer(source):
            module = match.group("module").strip()
            if module:
                dependencies.add((module, "import"))

        return sorted(dependencies)

    def _extract_java_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract Java package imports, extends, and implements."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._JAVA_IMPORT_PATTERN.finditer(source):
            imp = m.group(1).strip()
            if imp:
                dependencies.add((imp, "import"))

        for m in self._JAVA_EXTENDS_PATTERN.finditer(source):
            bases = [b.strip() for b in m.group(2).split(",") if b.strip()]
            for b in bases:
                dependencies.add((b, "extends"))

        for m in self._JAVA_IMPLEMENTS_PATTERN.finditer(source):
            interfaces = [i.strip() for i in m.group(2).split(",") if i.strip()]
            for iface in interfaces:
                dependencies.add((iface, "implements"))

        return sorted(dependencies)

    def _extract_scala_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract Scala imports, extends, and trait mixins."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._SCALA_IMPORT_PATTERN.finditer(source):
            imp = m.group(1).strip()
            if imp:
                dependencies.add((imp, "import"))

        for m in self._SCALA_EXTENDS_PATTERN.finditer(source):
            base = m.group(2).strip()
            if base:
                dependencies.add((base, "extends"))

        for m in self._SCALA_WITH_PATTERN.finditer(source):
            trait = m.group(1).strip()
            if trait:
                dependencies.add((trait, "implements"))

        return sorted(dependencies)

    def _extract_go_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract Go package imports."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._GO_SINGLE_IMPORT_PATTERN.finditer(source):
            imp = m.group(1).strip()
            if imp:
                dependencies.add((imp, "import"))

        for m in self._GO_MULTI_IMPORT_PATTERN.finditer(source):
            block = m.group(1)
            for line_m in self._GO_IMPORT_LINE_PATTERN.finditer(block):
                imp = line_m.group(1).strip()
                if imp:
                    dependencies.add((imp, "import"))

        return sorted(dependencies)

    def _extract_rust_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract Rust crate uses and modules."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._RUST_USE_PATTERN.finditer(source):
            use_path = m.group(1).strip()
            if use_path:
                dependencies.add((use_path, "import"))

        for m in self._RUST_MOD_PATTERN.finditer(source):
            mod_name = m.group(1).strip()
            if mod_name:
                dependencies.add((mod_name, "module"))

        return sorted(dependencies)

    def _extract_cpp_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract C/C++ include directives."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._CPP_INCLUDE_PATTERN.finditer(source):
            inc = m.group(1).strip()
            if inc:
                dependencies.add((inc, "import"))

        return sorted(dependencies)

    def _extract_csharp_dependencies(
        self,
        path: Path,
    ) -> list[tuple[str, str]]:
        """Extract C# using namespaces."""
        try:
            source = path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            return []

        dependencies: set[tuple[str, str]] = set()

        for m in self._CS_USING_PATTERN.finditer(source):
            ns = m.group(1).strip()
            if ns:
                dependencies.add((ns, "import"))

        return sorted(dependencies)

    def _build_symbol_index(
        self,
        files: list[Path],
        root_path: Path,
    ) -> dict[str, object]:
        """
        Build an index mapping module stems, FQCN packages, and relative paths
        to canonical internal node IDs.
        """
        nodes_set: set[str] = set()
        stems_to_paths: dict[str, list[str]] = {}
        fqcn_to_path: dict[str, str] = {}
        python_modules_to_path: dict[str, str] = {}
        dirs_to_files: dict[str, list[str]] = {}
        path_suffixes_to_node: dict[str, str] = {}

        for path in files:
            rel = self._relative_path(path, root_path)
            nodes_set.add(rel)

            # Pre-index path-aligned suffixes for O(1) module resolution
            parts = rel.split("/")
            for i in range(len(parts)):
                suffix = "/".join(parts[i:])
                path_suffixes_to_node.setdefault(suffix, rel)

            stem = path.stem
            stems_to_paths.setdefault(stem, []).append(rel)

            parent_dir = Path(rel).parent.as_posix()
            dirs_to_files.setdefault(parent_dir, []).append(rel)

            ext = path.suffix.lower()

            if ext == ".py":
                parts = Path(rel).with_suffix("").parts
                dotted = ".".join(parts)
                python_modules_to_path[dotted] = rel
                if parts and parts[0] in ("src", "apps", "lib"):
                    python_modules_to_path[".".join(parts[1:])] = rel
                if len(parts) >= 2 and parts[0] == "apps" and parts[1] == "backend":
                    python_modules_to_path[".".join(parts[2:])] = rel

            elif ext in (".java", ".scala", ".sc"):
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as f:
                        header = f.read(1000)
                    m = re.search(r"^\s*package\s+([A-Za-z0-9_.]+)", header, re.MULTILINE)
                    if m:
                        pkg = m.group(1).strip()
                        fqcn = f"{pkg}.{stem}"
                        fqcn_to_path[fqcn] = rel
                        fqcn_to_path[pkg] = rel
                except Exception:
                    pass

        dir_suffixes_to_first_file: dict[str, str] = {}
        for d in sorted(dirs_to_files.keys()):
            f_list = dirs_to_files[d]
            if f_list:
                d_parts = d.split("/")
                for i in range(len(d_parts)):
                    suffix = "/".join(d_parts[i:])
                    dir_suffixes_to_first_file.setdefault(suffix, f_list[0])

        return {
            "nodes_set": nodes_set,
            "stems_to_paths": stems_to_paths,
            "fqcn_to_path": fqcn_to_path,
            "python_modules_to_path": python_modules_to_path,
            "dirs_to_files": dirs_to_files,
            "path_suffixes_to_node": path_suffixes_to_node,
            "dir_suffixes_to_first_file": dir_suffixes_to_first_file,
        }

    def _resolve_target(
        self,
        *,
        target: str,
        source_rel: str,
        symbol_index: dict[str, object],
    ) -> str:
        """
        Resolve an import / dependency target string into an internal file node ID if possible.
        If the target cannot be resolved to an internal node, returns the original target string.
        """
        nodes_set: set[str] = symbol_index["nodes_set"]  # type: ignore
        stems_to_paths: dict[str, list[str]] = symbol_index["stems_to_paths"]  # type: ignore
        fqcn_to_path: dict[str, str] = symbol_index["fqcn_to_path"]  # type: ignore
        python_modules_to_path: dict[str, str] = symbol_index["python_modules_to_path"]  # type: ignore
        dirs_to_files: dict[str, list[str]] = symbol_index["dirs_to_files"]  # type: ignore
        path_suffixes_to_node: dict[str, str] = symbol_index.get("path_suffixes_to_node", {})  # type: ignore
        dir_suffixes_to_first_file: dict[str, str] = symbol_index.get("dir_suffixes_to_first_file", {})  # type: ignore

        clean_target = target.strip()
        source_dir = Path(source_rel).parent.as_posix()

        # 1. Exact match to an existing node
        if clean_target in nodes_set:
            return clean_target

        # 2. Relative JS/TS / C/C++ import: e.g. "./Button", "../common/utils"
        if clean_target.startswith(("./", "../")):
            norm_rel = os.path.normpath(f"{source_dir}/{clean_target}").replace("\\", "/")
            for ext in ("", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".d.ts"):
                candidate = f"{norm_rel}{ext}"
                if candidate in nodes_set:
                    return candidate
                index_candidate = f"{norm_rel}/index{ext}"
                if index_candidate in nodes_set:
                    return index_candidate

        # 3. TS alias import: "@/components/Button" or "~/..."
        if clean_target.startswith(("@/", "~/")):
            clean_alias = clean_target[2:]
            for prefix in ("src/", "", "app/"):
                for ext in ("", ".ts", ".tsx", ".js", ".jsx"):
                    candidate = f"{prefix}{clean_alias}{ext}"
                    if candidate in nodes_set:
                        return candidate

        # 4. Java / Scala FQCN: e.g. "org.apache.kafka.clients.producer.Producer"
        if clean_target in fqcn_to_path:
            return fqcn_to_path[clean_target]
        if clean_target.endswith(".*"):
            pkg = clean_target[:-2]
            if pkg in fqcn_to_path:
                return fqcn_to_path[pkg]

        as_slash = clean_target.replace(".", "/")
        cand_java = f"{as_slash}.java"
        if cand_java in path_suffixes_to_node:
            return path_suffixes_to_node[cand_java]
        cand_scala = f"{as_slash}.scala"
        if cand_scala in path_suffixes_to_node:
            return path_suffixes_to_node[cand_scala]

        # 5. Python module path: "app.services.order_service" or relative ".utils"
        if clean_target.startswith("."):
            dots = len(clean_target) - len(clean_target.lstrip("."))
            mod_part = clean_target[dots:]
            parts = Path(source_rel).parts
            if len(parts) > dots:
                base_dir = "/".join(parts[:-dots])
                candidate_rel = f"{base_dir}/{mod_part.replace('.', '/')}.py"
                if candidate_rel in nodes_set:
                    return candidate_rel
                candidate_pkg = f"{base_dir}/{mod_part.replace('.', '/')}/__init__.py"
                if candidate_pkg in nodes_set:
                    return candidate_pkg
        elif clean_target in python_modules_to_path:
            return python_modules_to_path[clean_target]
        else:
            py_path = f"{as_slash}.py"
            if py_path in path_suffixes_to_node:
                return path_suffixes_to_node[py_path]

        # 6. Go package directory import: "coodara/pkg/auth" or "pkg/auth"
        if "/" in clean_target:
            if clean_target in dir_suffixes_to_first_file:
                return dir_suffixes_to_first_file[clean_target]
            target_parts = clean_target.split("/")
            for i in range(1, len(target_parts)):
                sub_d = "/".join(target_parts[i:])
                if sub_d in dirs_to_files and dirs_to_files[sub_d]:
                    return dirs_to_files[sub_d][0]
        elif clean_target in dir_suffixes_to_first_file:
            return dir_suffixes_to_first_file[clean_target]

        # 7. Rust module: "crate::auth::token" -> "src/auth/token.rs"
        if "::" in clean_target:
            rust_path = clean_target.replace("crate::", "").replace("::", "/")
            rust_cand = f"{rust_path}.rs"
            if rust_cand in path_suffixes_to_node:
                return path_suffixes_to_node[rust_cand]
            rust_mod_cand = f"{rust_path}/mod.rs"
            if rust_mod_cand in path_suffixes_to_node:
                return path_suffixes_to_node[rust_mod_cand]

        # 8. Single class / stem match fallback (if unique in repo)
        stem_target = clean_target.split(".")[-1].split("::")[-1]
        if stem_target in stems_to_paths and len(stems_to_paths[stem_target]) == 1:
            return stems_to_paths[stem_target][0]

        return clean_target

    @staticmethod
    def _relative_path(
        path: Path,
        root_path: Path,
    ) -> str:
        return path.relative_to(root_path).as_posix()