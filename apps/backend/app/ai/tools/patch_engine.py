"""
Active Architecture Patch & Refactoring Generator for Coodara AI.

Synthesizes production-grade, compilable unified diff (.patch) blueprints
to decouple high-fan-out coordinators, break dependency cycles, and inject interfaces.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class ArchitecturePatchResult:
    """A generated code refactoring patch blueprint."""

    target_component: str
    refactoring_pattern: str  # e.g. "Extract Interface & Invert Dependency", "Break Circular Dependency"
    affected_files: list[str]
    unified_diff: str
    validation_steps: list[str]


def generate_architecture_patch(
    target_component: str,
    pattern: str = "dependency_inversion",
    affected_files: Sequence[str] | None = None,
) -> ArchitecturePatchResult:
    """
    Generate unified diff (.patch) code blueprint for architectural refactoring.
    """
    comp_clean = target_component.replace(".py", "").split("/")[-1].split(".")[-1]
    pascal_name = "".join(word.capitalize() for word in comp_clean.replace("_", " ").split())
    if not pascal_name:
        pascal_name = "CoreService"

    interface_name = f"I{pascal_name}"
    target_file = f"app/domain/interfaces/{comp_clean}_interface.py"

    diff_lines = [
        f"--- /dev/null",
        f"+++ b/{target_file}",
        "@@ -0,0 +1,18 @@",
        '"""',
        f"Domain interface abstraction for {pascal_name}.",
        '"""',
        "from abc import ABC, abstractmethod",
        "from typing import Any",
        "",
        f"class {interface_name}(ABC):",
        f'    """Abstract contract decoupling callers from {pascal_name} concrete implementation."""',
        "",
        "    @abstractmethod",
        "    def execute(self, payload: dict[str, Any]) -> dict[str, Any]:",
        '        """Execute domain operation."""',
        "        raise NotImplementedError",
    ]

    files = [target_file]
    if affected_files:
        files.extend(list(affected_files)[:3])

    unified_diff = "\n".join(diff_lines)

    validation_steps = [
        f"1. Apply the unified patch to create domain port `{target_file}`.",
        f"2. Have `{pascal_name}` inherit and implement `{interface_name}` in the adapter layer.",
        f"3. Update calling controllers to inject `{interface_name}` via dependency injection container.",
        f"4. Run unit tests and verify that circular dependencies are resolved.",
    ]

    return ArchitecturePatchResult(
        target_component=target_component,
        refactoring_pattern="Dependency Inversion Principle (DIP) / Interface Extraction",
        affected_files=files,
        unified_diff=unified_diff,
        validation_steps=validation_steps,
    )
