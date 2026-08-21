from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar

from .context import RepositoryContext

ResultT = TypeVar("ResultT")


class Analyzer(ABC, Generic[ResultT]):
    """Base contract for deterministic repository analyzers."""

    name: str

    @abstractmethod
    def analyze(
        self,
        context: RepositoryContext,
    ) -> ResultT:
        """Analyze the repository and return a structured result."""
        raise NotImplementedError