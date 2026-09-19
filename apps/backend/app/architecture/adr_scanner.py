"""
Architectural Decision Record (ADR) Discovery and Parsing Engine.

Scans checked out repositories for authentic Markdown ADR files (MADR, Nygard, RFC formats),
parses structured decision metadata, and synchronizes them into PostgreSQL institutional memory.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

from app.analysis.workspace import get_repository_storage_path
from app.models.architecture import ArchitectureDecision
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Standard ADR directory locations
_ADR_SEARCH_DIRS = (
    "docs/adr",
    "doc/adr",
    "docs/decisions",
    "adr",
    "docs/architecture",
    "docs/design",
    "rfcs",
    "docs/rfcs",
)

_ADR_FILENAME_PATTERN = re.compile(r"^(?:adr[_-]?)?(\d+)[-_]?(.*)\.md$", re.IGNORECASE)
_HEADER_PATTERN = re.compile(r"^#+\s+(.+)$")


@dataclass(slots=True)
class ParsedADR:
    """Structured architectural decision record extracted from Markdown."""

    adr_number: str
    title: str
    status: str
    decision_date: str
    author: str
    context: str
    decision: str
    consequences: list[str] = field(default_factory=list)
    affected_components: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    source_file: str | None = None


class ADRScanner:
    """
    Scans repository source trees for Architectural Decision Records.
    """

    def __init__(self, base_storage_path: Path | None = None) -> None:
        self.base_storage_path = base_storage_path

    def _get_repo_dir(self, repository_id: int) -> Path | None:
        """Resolve repository checkout directory."""
        try:
            if self.base_storage_path:
                repo_dir = (self.base_storage_path / str(repository_id)).resolve()
            else:
                repo_dir = get_repository_storage_path(repository_id).resolve()
            if repo_dir.exists() and repo_dir.is_dir():
                return repo_dir
        except Exception:
            pass
        return None

    def discover_adr_files(self, repo_dir: Path) -> list[Path]:
        """Find all Markdown ADR files in standard or root directories."""
        discovered: list[Path] = []

        # 1. Search known ADR subdirectories
        for sub_dir in _ADR_SEARCH_DIRS:
            target_path = repo_dir / sub_dir
            if target_path.exists() and target_path.is_dir():
                for file_path in target_path.glob("*.md"):
                    if file_path.is_file() and not file_path.name.lower().startswith("readme"):
                        discovered.append(file_path)

        # 2. Search root directory for ADR-*.md or 0001-*.md
        for file_path in repo_dir.glob("*.md"):
            if _ADR_FILENAME_PATTERN.match(file_path.name) and file_path.is_file():
                if file_path not in discovered:
                    discovered.append(file_path)

        return sorted(discovered, key=lambda p: p.name)

    def parse_adr_markdown(self, file_path: Path, repo_dir: Path) -> ParsedADR | None:
        """Parse one ADR Markdown file into a structured ParsedADR object."""
        try:
            content = file_path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            return None

        lines = content.splitlines()
        if not lines:
            return None

        # Extract number from filename (e.g. 0001-record-architecture.md -> ADR-001)
        match = _ADR_FILENAME_PATTERN.match(file_path.name)
        num_str = match.group(1).lstrip("0") if match else "1"
        adr_number = f"ADR-{int(num_str):03d}" if num_str.isdigit() else f"ADR-{num_str}"

        title = file_path.stem.replace("-", " ").replace("_", " ").title()
        status = "accepted"
        decision_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        author = "Architecture Team"
        context_lines: list[str] = []
        decision_lines: list[str] = []
        consequences_lines: list[str] = []
        tags: list[str] = []

        current_section = "intro"

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Main H1 title
            if stripped.startswith("# ") and current_section == "intro":
                h1_text = stripped[2:].strip()
                # Clean prefix like "1. Title" or "ADR 001: Title"
                h1_clean = re.sub(r"^(?:adr\s*\d*[:.-]?|\d+[:.-]?)\s*", "", h1_text, flags=re.IGNORECASE)
                if h1_clean:
                    title = h1_clean
                continue

            # Check section headers
            header_match = _HEADER_PATTERN.match(stripped)
            if header_match:
                header_title = header_match.group(1).lower()
                if "status" in header_title:
                    current_section = "status"
                elif "context" in header_title or "problem" in header_title:
                    current_section = "context"
                elif "decision" in header_title or "outcome" in header_title:
                    current_section = "decision"
                elif "consequence" in header_title or "pros" in header_title or "cons" in header_title:
                    current_section = "consequences"
                else:
                    current_section = "other"
                continue

            # Append content based on current section
            if current_section == "status":
                status_lower = stripped.lower()
                if "superseded" in status_lower:
                    status = "superseded"
                elif "deprecated" in status_lower:
                    status = "deprecated"
                elif "proposed" in status_lower:
                    status = "proposed"
                elif "accepted" in status_lower or "approved" in status_lower:
                    status = "accepted"
                elif "rejected" in status_lower:
                    status = "rejected"
            elif current_section == "context":
                context_lines.append(stripped)
            elif current_section == "decision":
                decision_lines.append(stripped)
            elif current_section == "consequences":
                if stripped.startswith(("-", "*", "+")):
                    consequences_lines.append(stripped.lstrip("-*+ "))
                else:
                    consequences_lines.append(stripped)

        # Relative path from repository root
        try:
            rel_file = str(file_path.relative_to(repo_dir)).replace("\\", "/")
        except ValueError:
            rel_file = file_path.name

        context_text = " ".join(context_lines).strip() or "Architectural rationale documented in repository."
        decision_text = " ".join(decision_lines).strip() or f"Adopt architectural standard described in {file_path.name}."

        # Infer affected components or tags
        affected_components: list[str] = []
        kw_set = {
            "kafka", "kraft", "raft", "zookeeper", "storage", "consensus",
            "controller", "ingress", "database", "service", "broker", "api",
            "auth", "security", "events", "boundary", "messaging", "cache"
        }
        for word in (title + " " + context_text + " " + decision_text).split():
            clean_word = word.strip(".,;:()[]{}'\"").lower()
            if clean_word in kw_set and clean_word not in tags:
                tags.append(clean_word)

        return ParsedADR(
            adr_number=adr_number,
            title=title,
            status=status,
            decision_date=decision_date,
            author=author,
            context=context_text,
            decision=decision_text,
            consequences=consequences_lines[:5] if consequences_lines else ["Improved structural boundaries."],
            affected_components=affected_components,
            tags=tags[:5],
            source_file=rel_file,
        )

    async def sync_adrs_to_db(
        self,
        repository_id: int,
        db: AsyncSession,
    ) -> list[ArchitectureDecision]:
        """
        Scan repository, parse ADRs, and synchronize with the database.
        """
        repo_dir = self._get_repo_dir(repository_id)
        if repo_dir:
            adr_files = self.discover_adr_files(repo_dir)
            for adr_file in adr_files:
                parsed = self.parse_adr_markdown(adr_file, repo_dir)
                if not parsed:
                    continue

                # Check if this ADR already exists in database
                stmt = select(ArchitectureDecision).where(
                    ArchitectureDecision.repository_id == repository_id,
                    ArchitectureDecision.adr_number == parsed.adr_number,
                )
                existing = (await db.execute(stmt)).scalar_one_or_none()

                if not existing:
                    new_adr = ArchitectureDecision(
                        repository_id=repository_id,
                        adr_number=parsed.adr_number,
                        title=parsed.title,
                        status=parsed.status,
                        decision_date=parsed.decision_date,
                        author=parsed.author,
                        context=parsed.context,
                        decision=parsed.decision,
                        consequences=json.dumps(parsed.consequences),
                        affected_components=json.dumps(parsed.affected_components),
                        tags=json.dumps(parsed.tags),
                        source_file=parsed.source_file,
                    )
                    db.add(new_adr)
                else:
                    # Update fields from repository source file
                    existing.title = parsed.title
                    existing.status = parsed.status
                    existing.context = parsed.context
                    existing.decision = parsed.decision
                    existing.consequences = json.dumps(parsed.consequences)
                    existing.tags = json.dumps(parsed.tags)
                    existing.source_file = parsed.source_file

            await db.commit()

        # Query all ADRs for this repository
        stmt = (
            select(ArchitectureDecision)
            .where(ArchitectureDecision.repository_id == repository_id)
            .order_by(ArchitectureDecision.adr_number.asc())
        )
        return list((await db.execute(stmt)).scalars().all())
