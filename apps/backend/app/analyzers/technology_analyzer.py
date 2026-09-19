"""
Repository technology analyzer.

Detects programming languages, frameworks, runtimes, package managers,
and infrastructure technologies from repository source files and manifests.

The analyzer is:
- deterministic
- filesystem-only
- side-effect free
- independent of SQLAlchemy/FastAPI/GitHub
- safe against unreadable or malformed files
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Final

from app.analyzers.base import Analyzer
from app.analyzers.context import RepositoryContext
from app.analyzers.exceptions import AnalyzerExecutionError
from app.analyzers.models import TechnologySnapshot


@dataclass(frozen=True, slots=True)
class _Detection:
    """Internal technology detection."""

    technology: str
    version: str | None
    confidence_score: float


class TechnologyAnalyzer(
    Analyzer[tuple[TechnologySnapshot, ...]],
):
    """
    Detect technologies used by a repository.

    Detection is intentionally conservative. A technology is emitted only
    when there is sufficient evidence from the repository contents.

    Detection sources include:
    - source-file extensions
    - dependency manifests
    - framework dependencies
    - infrastructure configuration
    """

    name: Final[str] = "technology"

    _IGNORED_DIRECTORIES: Final[frozenset[str]] = frozenset(
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
        }
    )

    _LANGUAGE_EXTENSIONS: Final[dict[str, str]] = {
        ".py": "Python",
        ".js": "JavaScript",
        ".jsx": "JavaScript",
        ".ts": "TypeScript",
        ".tsx": "TypeScript",
        ".java": "Java",
        ".go": "Go",
        ".rs": "Rust",
        ".php": "PHP",
        ".cs": "C#",
        ".c": "C",
        ".h": "C",
        ".cpp": "C++",
        ".cc": "C++",
        ".cxx": "C++",
        ".swift": "Swift",
        ".kt": "Kotlin",
        ".kts": "Kotlin",
        ".rb": "Ruby",
        ".scala": "Scala",
        ".sql": "SQL",
    }

    _MANIFESTS: Final[frozenset[str]] = frozenset(
        {
            "pyproject.toml",
            "requirements.txt",
            "requirements-dev.txt",
            "package.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "package-lock.json",
            "go.mod",
            "Cargo.toml",
            "pom.xml",
            "build.gradle",
            "build.gradle.kts",
            "composer.json",
            "Gemfile",
            "Dockerfile",
            "docker-compose.yml",
            "docker-compose.yaml",
        }
    )

    def analyze(
        self,
        context: RepositoryContext,
    ) -> tuple[TechnologySnapshot, ...]:
        """
        Analyze repository contents and return detected technologies.

        The result is deterministic for a given repository state.
        """

        try:
            detections: dict[str, _Detection] = {}

            self._detect_languages(
                context.root_path,
                detections,
            )

            self._detect_manifests(
                context.root_path,
                detections,
            )

            self._detect_infrastructure(
                context.root_path,
                detections,
            )

            return self._build_result(detections)

        except AnalyzerExecutionError:
            raise

        except Exception as exc:
            raise AnalyzerExecutionError(
                "Technology analyzer failed.",
            ) from exc

    def _detect_languages(
        self,
        root_path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect programming languages from source-file extensions."""

        counts: dict[str, int] = {}

        for path in self._iter_files(root_path):
            language = self._LANGUAGE_EXTENSIONS.get(
                path.suffix.lower(),
            )

            if language is None:
                continue

            counts[language] = counts.get(language, 0) + 1

        total = sum(counts.values())

        if total == 0:
            return

        for language, count in counts.items():
            confidence = min(
                0.95,
                0.60 + (count / total) * 0.35,
            )

            self._record(
                detections,
                technology=language,
                version=None,
                confidence_score=confidence,
            )

    def _detect_manifests(
        self,
        root_path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect technologies from known dependency manifests."""

        for path in self._iter_manifest_files(root_path):
            filename = path.name.lower()

            if filename == "pyproject.toml":
                self._detect_python_manifest(
                    path,
                    detections,
                )

            elif filename in {
                "requirements.txt",
                "requirements-dev.txt",
            }:
                self._detect_requirements(
                    path,
                    detections,
                )

            elif filename == "package.json":
                self._detect_node_manifest(
                    path,
                    detections,
                )

            elif filename == "go.mod":
                self._record(
                    detections,
                    technology="Go Modules",
                    version=None,
                    confidence_score=0.98,
                )

            elif filename == "cargo.toml":
                self._record(
                    detections,
                    technology="Cargo",
                    version=None,
                    confidence_score=0.98,
                )

                self._record(
                    detections,
                    technology="Rust",
                    version=None,
                    confidence_score=0.98,
                )

            elif filename == "pom.xml":
                self._record(
                    detections,
                    technology="Maven",
                    version=None,
                    confidence_score=0.98,
                )

                self._detect_text_dependencies(
                    path,
                    detections,
                    {
                        "spring-boot": "Spring Boot",
                        "springframework": "Spring Framework",
                    },
                )

            elif filename in {
                "build.gradle",
                "build.gradle.kts",
            }:
                self._record(
                    detections,
                    technology="Gradle",
                    version=None,
                    confidence_score=0.98,
                )

            elif filename == "composer.json":
                self._record(
                    detections,
                    technology="Composer",
                    version=None,
                    confidence_score=0.98,
                )

                self._detect_json_dependencies(
                    path,
                    detections,
                    {
                        "laravel/framework": "Laravel",
                    },
                )

            elif filename == "gemfile":
                self._record(
                    detections,
                    technology="Bundler",
                    version=None,
                    confidence_score=0.98,
                )

    def _detect_python_manifest(
        self,
        path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect Python tooling and frameworks from pyproject.toml."""

        text = self._read_text(path)

        if text is None:
            return

        self._record(
            detections,
            technology="Python",
            version=None,
            confidence_score=0.98,
        )

        dependency_map = {
            "fastapi": "FastAPI",
            "django": "Django",
            "flask": "Flask",
            "starlette": "Starlette",
            "sqlalchemy": "SQLAlchemy",
            "pydantic": "Pydantic",
            "pytest": "Pytest",
            "celery": "Celery",
            "langchain": "LangChain",
            "llama-index": "LlamaIndex",
            "llama_index": "LlamaIndex",
        }

        lowered = text.lower()

        for dependency, technology in dependency_map.items():
            if re.search(
                rf"(?<![\w-]){re.escape(dependency)}(?![\w-])",
                lowered,
            ):
                version = self._extract_dependency_version(
                    text,
                    dependency,
                )

                self._record(
                    detections,
                    technology=technology,
                    version=version,
                    confidence_score=0.96,
                )

        if "[tool.poetry]" in lowered:
            self._record(
                detections,
                technology="Poetry",
                version=None,
                confidence_score=0.98,
            )

    def _detect_requirements(
        self,
        path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect Python dependencies from requirements files."""

        text = self._read_text(path)

        if text is None:
            return

        self._record(
            detections,
            technology="Python",
            version=None,
            confidence_score=0.96,
        )

        dependency_map = {
            "fastapi": "FastAPI",
            "django": "Django",
            "flask": "Flask",
            "sqlalchemy": "SQLAlchemy",
            "pydantic": "Pydantic",
            "pytest": "Pytest",
            "celery": "Celery",
            "langchain": "LangChain",
            "llama-index": "LlamaIndex",
        }

        for line in text.splitlines():
            normalized = line.strip()

            if not normalized or normalized.startswith("#"):
                continue

            package_match = re.match(
                r"^([A-Za-z0-9_.-]+)",
                normalized,
            )

            if package_match is None:
                continue

            package = package_match.group(1).lower()

            technology = dependency_map.get(package)

            if technology is None:
                continue

            version = self._extract_requirement_version(
                normalized,
            )

            self._record(
                detections,
                technology=technology,
                version=version,
                confidence_score=0.96,
            )

    def _detect_node_manifest(
        self,
        path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect Node.js ecosystem technologies from package.json."""

        data = self._read_json(path)

        if data is None:
            return

        self._record(
            detections,
            technology="Node.js",
            version=None,
            confidence_score=0.98,
        )

        dependencies: dict[str, str] = {}

        for key in (
            "dependencies",
            "devDependencies",
            "peerDependencies",
            "optionalDependencies",
        ):
            value = data.get(key)

            if isinstance(value, dict):
                for package, version in value.items():
                    if isinstance(package, str):
                        dependencies[package.lower()] = (
                            version
                            if isinstance(version, str)
                            else ""
                        )

        dependency_map = {
            "react": "React",
            "react-dom": "React",
            "next": "Next.js",
            "vue": "Vue",
            "@angular/core": "Angular",
            "express": "Express",
            "fastify": "Fastify",
            "nestjs": "NestJS",
            "@nestjs/core": "NestJS",
            "typescript": "TypeScript",
            "vite": "Vite",
            "webpack": "Webpack",
            "tailwindcss": "Tailwind CSS",
        }

        for package, technology in dependency_map.items():
            if package not in dependencies:
                continue

            version = self._normalize_version(
                dependencies[package],
            )

            self._record(
                detections,
                technology=technology,
                version=version,
                confidence_score=0.97,
            )

        package_manager = data.get("packageManager")

        if isinstance(package_manager, str):
            if package_manager.startswith("pnpm@"):
                self._record(
                    detections,
                    technology="pnpm",
                    version=package_manager.split("@", 1)[1],
                    confidence_score=0.99,
                )

            elif package_manager.startswith("yarn@"):
                self._record(
                    detections,
                    technology="Yarn",
                    version=package_manager.split("@", 1)[1],
                    confidence_score=0.99,
                )

            elif package_manager.startswith("npm@"):
                self._record(
                    detections,
                    technology="npm",
                    version=package_manager.split("@", 1)[1],
                    confidence_score=0.99,
                )

    def _detect_infrastructure(
        self,
        root_path: Path,
        detections: dict[str, _Detection],
    ) -> None:
        """Detect infrastructure technologies."""

        filenames = {
            path.name.lower()
            for path in self._iter_files(root_path)
        }

        if "dockerfile" in filenames:
            self._record(
                detections,
                technology="Docker",
                version=None,
                confidence_score=0.99,
            )

        if {
            "docker-compose.yml",
            "docker-compose.yaml",
        } & filenames:
            self._record(
                detections,
                technology="Docker Compose",
                version=None,
                confidence_score=0.99,
            )

        if "pnpm-lock.yaml" in filenames:
            self._record(
                detections,
                technology="pnpm",
                version=None,
                confidence_score=0.99,
            )

        if "yarn.lock" in filenames:
            self._record(
                detections,
                technology="Yarn",
                version=None,
                confidence_score=0.99,
            )

        if "package-lock.json" in filenames:
            self._record(
                detections,
                technology="npm",
                version=None,
                confidence_score=0.99,
            )

    def _detect_json_dependencies(
        self,
        path: Path,
        detections: dict[str, _Detection],
        dependency_map: dict[str, str],
    ) -> None:
        """Detect dependencies from a JSON manifest."""

        data = self._read_json(path)

        if data is None:
            return

        dependencies = data.get("require")

        if not isinstance(dependencies, dict):
            return

        for dependency, version in dependencies.items():
            technology = dependency_map.get(
                dependency.lower(),
            )

            if technology is None:
                continue

            self._record(
                detections,
                technology=technology,
                version=(
                    version
                    if isinstance(version, str)
                    else None
                ),
                confidence_score=0.97,
            )

    def _detect_text_dependencies(
        self,
        path: Path,
        detections: dict[str, _Detection],
        dependency_map: dict[str, str],
    ) -> None:
        """Detect dependency markers from text-based manifests."""

        text = self._read_text(path)

        if text is None:
            return

        lowered = text.lower()

        for dependency, technology in dependency_map.items():
            if dependency.lower() in lowered:
                self._record(
                    detections,
                    technology=technology,
                    version=None,
                    confidence_score=0.95,
                )

    def _record(
        self,
        detections: dict[str, _Detection],
        *,
        technology: str,
        version: str | None,
        confidence_score: float,
    ) -> None:
        """
        Record the strongest detection for a technology.

        Multiple evidence sources may identify the same technology.
        We retain the highest-confidence result and prefer a known
        version over an unknown version at equal confidence.
        """

        existing = detections.get(technology)

        if existing is None:
            detections[technology] = _Detection(
                technology=technology,
                version=version,
                confidence_score=confidence_score,
            )
            return

        if confidence_score > existing.confidence_score:
            detections[technology] = _Detection(
                technology=technology,
                version=version or existing.version,
                confidence_score=confidence_score,
            )
            return

        if (
            confidence_score == existing.confidence_score
            and existing.version is None
            and version is not None
        ):
            detections[technology] = _Detection(
                technology=technology,
                version=version,
                confidence_score=confidence_score,
            )

    def _build_result(
        self,
        detections: dict[str, _Detection],
    ) -> tuple[TechnologySnapshot, ...]:
        """Convert internal detections into deterministic domain output."""

        ordered = sorted(
            detections.values(),
            key=lambda detection: (
                -detection.confidence_score,
                detection.technology.lower(),
            ),
        )

        return tuple(
            TechnologySnapshot(
                technology=detection.technology,
                version=detection.version,
                confidence_score=round(
                    detection.confidence_score,
                    4,
                ),
            )
            for detection in ordered
        )

    def _iter_files(
        self,
        root_path: Path,
    ) -> list[Path]:
        """Return repository files safely and fast."""
        resolved_root = root_path.resolve()
        files: list[Path] = []
        max_file_count = 20000

        for root, dirnames, filenames in os.walk(root_path):
            dirnames[:] = [
                d for d in dirnames
                if d not in self._IGNORED_DIRECTORIES and not d.startswith(".")
            ]

            for filename in filenames:
                if len(files) >= max_file_count:
                    break

                path = Path(root) / filename
                try:
                    resolved = path.resolve()
                    if not resolved.is_relative_to(resolved_root):
                        continue
                except (ValueError, OSError):
                    continue

                files.append(path)

            if len(files) >= max_file_count:
                break

        files.sort(
            key=lambda path: path.as_posix().lower(),
        )

        return files

    def _iter_manifest_files(
        self,
        root_path: Path,
    ) -> list[Path]:
        """Return supported manifest files deterministically."""

        return [
            path
            for path in self._iter_files(root_path)
            if path.name in self._MANIFESTS
        ]

    @staticmethod
    def _read_text(
        path: Path,
    ) -> str | None:
        """Read UTF-8 text safely."""

        try:
            return path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except (OSError, UnicodeError):
            return None

    @staticmethod
    def _read_json(
        path: Path,
    ) -> dict[str, object] | None:
        """Read a JSON manifest safely."""

        try:
            value = json.loads(
                path.read_text(
                    encoding="utf-8",
                    errors="replace",
                ),
            )
        except (OSError, UnicodeError, json.JSONDecodeError):
            return None

        if not isinstance(value, dict):
            return None

        return value

    @staticmethod
    def _extract_dependency_version(
        text: str,
        dependency: str,
    ) -> str | None:
        """Extract a simple dependency version from TOML-like text."""

        pattern = re.compile(
            rf'["\']?{re.escape(dependency)}["\']?\s*='
            rf'\s*["\']([^"\']+)["\']',
            re.IGNORECASE,
        )

        match = pattern.search(text)

        if match is None:
            return None

        return TechnologyAnalyzer._normalize_version(
            match.group(1),
        )

    @staticmethod
    def _extract_requirement_version(
        requirement: str,
    ) -> str | None:
        """Extract a version constraint from a requirements line."""

        match = re.search(
            r"(?:==|~=|>=|<=|>|<)\s*([0-9][^,\s;]*)",
            requirement,
        )

        if match is None:
            return None

        return match.group(1)

    @staticmethod
    def _normalize_version(
        version: str | None,
    ) -> str | None:
        """Normalize common package version prefixes."""

        if not version:
            return None

        normalized = version.strip()

        normalized = normalized.lstrip(
            "^~>=<! ",
        )

        normalized = normalized.removeprefix("v")

        return normalized or None