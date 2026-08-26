"""
Coodara AI Chat application service.
"""

from __future__ import annotations

from app.ai.chat.context import (
    ChatContext,
    build_system_prompt,
)
from app.ai.llm import (
    LLMManager,
    LLMMessage,
    LLMResponse,
)
from app.repositories.analysis_repository import (
    AnalysisRepository,
)
from app.repositories.architecture_repository import (
    ArchitectureRepository,
)
from app.repositories.repository_repository import (
    RepositoryRepository,
)
from sqlalchemy.ext.asyncio import AsyncSession


class ChatServiceError(Exception):
    """Base exception for chat service failures."""


class ChatRepositoryNotFoundError(ChatServiceError):
    """Repository does not exist or is not accessible."""


class ChatService:
    """
    Application service for Coodara AI Chat.
    """

    def __init__(
        self,
        db: AsyncSession,
        *,
        llm_manager: LLMManager | None = None,
    ) -> None:
        self.repository_repository = RepositoryRepository(db)
        self.analysis_repository = AnalysisRepository(db)
        self.architecture_repository = ArchitectureRepository(db)
        self.llm_manager = llm_manager or LLMManager()

    async def chat(
        self,
        *,
        organization_id: int,
        repository_id: int,
        message: str,
    ) -> LLMResponse:
        """
        Answer a user question using repository intelligence.
        """

        repository = (
            await self.repository_repository
            .get_by_organization_and_id(
                organization_id=organization_id,
                repository_id=repository_id,
            )
        )

        if repository is None:
            raise ChatRepositoryNotFoundError(
                "Repository not found.",
            )

        architecture = (
            await self.architecture_repository
            .get_latest_by_repository(
                repository_id=repository_id,
            )
        )

        architecture_summary = None

        if architecture is not None:
            architecture_summary = (
                f"Architecture snapshot version "
                f"{architecture.snapshot_version}."
            )

            if architecture.score is not None:
                architecture_summary += (
                    f" Overall architecture score: "
                    f"{architecture.score.score:.1f}/100."
                )

        context = ChatContext(
            repository_name=repository.name,
            repository_full_name=repository.full_name,
            architecture_summary=architecture_summary,
        )

        system_prompt = build_system_prompt(
            context,
        )

        return await self.llm_manager.generate(
            messages=[
                LLMMessage(
                    role="system",
                    content=system_prompt,
                ),
                LLMMessage(
                    role="user",
                    content=message,
                ),
            ],
        )