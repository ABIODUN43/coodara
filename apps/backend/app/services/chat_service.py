"""
Coodara AI Chat application service.

Grounds conversational queries in Coodara AST, Architecture Snapshots,
structured Graph Calculations, and persistent V2 Architecture Memory.
Manages persistent chat sessions and message history.
"""

from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import Any

from app.ai.chat.context_engine import ArchitectureContextEngine
from app.ai.llm import (
    LLMManager,
    LLMMessage,
    LLMResponse,
)
from app.ai.memory.retriever import ArchitectureMemoryRetriever
from app.models.chat import ChatMessage, ChatSession
from app.repositories.analysis_repository import (
    AnalysisRepository,
)
from app.repositories.architecture_memory_repository import (
    ArchitectureMemoryRepository,
)
from app.repositories.architecture_repository import (
    ArchitectureRepository,
)
from app.repositories.chat_repository import ChatRepository
from app.repositories.repository_repository import (
    RepositoryRepository,
)
from app.schemas.chat import ChatMessageHistoryItem
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class ChatServiceError(Exception):
    """Base exception for chat service failures."""


class ChatRepositoryNotFoundError(ChatServiceError):
    """Repository does not exist or is not accessible."""


class ChatSessionNotFoundError(ChatServiceError):
    """Chat session does not exist or does not belong to organization."""


class ChatService:
    """
    Application service for Coodara AI Architecture Assistant.
    """

    def __init__(
        self,
        db: AsyncSession,
        *,
        llm_manager: LLMManager | None = None,
        retriever: ArchitectureMemoryRetriever | None = None,
        context_engine: ArchitectureContextEngine | None = None,
    ) -> None:
        self.repository_repository = RepositoryRepository(db)
        self.analysis_repository = AnalysisRepository(db)
        self.architecture_repository = ArchitectureRepository(db)
        self.memory_repository = ArchitectureMemoryRepository(db)
        self.chat_repository = ChatRepository(db)
        self.llm_manager = llm_manager or LLMManager()
        self.retriever = retriever or ArchitectureMemoryRetriever()
        self.context_engine = context_engine or ArchitectureContextEngine()

    async def list_sessions(
        self,
        *,
        organization_id: int,
        repository_id: int | None = None,
        limit: int = 50,
    ) -> Sequence[ChatSession]:
        """
        List persistent chat sessions for an organization.
        """
        return await self.chat_repository.list_sessions(
            organization_id=organization_id,
            repository_id=repository_id,
            limit=limit,
        )

    async def create_session(
        self,
        *,
        organization_id: int,
        repository_id: int | None = None,
        user_id: int | None = None,
        title: str = "Architecture Chat",
    ) -> ChatSession:
        """
        Create a new persistent chat session.
        """
        return await self.chat_repository.create_session(
            organization_id=organization_id,
            repository_id=repository_id,
            user_id=user_id,
            title=title,
        )

    async def get_session(
        self,
        *,
        session_id: int,
        organization_id: int,
    ) -> ChatSession:
        """
        Get a chat session verifying organization tenancy.
        """
        session = await self.chat_repository.get_session(
            session_id=session_id,
            organization_id=organization_id,
        )
        if session is None:
            raise ChatSessionNotFoundError("Chat session not found.")
        return session

    async def list_session_messages(
        self,
        *,
        session_id: int,
        organization_id: int,
        limit: int = 100,
    ) -> Sequence[ChatMessage]:
        """
        List messages belonging to a chat session in chronological order.
        """
        session = await self.get_session(session_id=session_id, organization_id=organization_id)
        return await self.chat_repository.list_messages(session_id=session.id, limit=limit)

    async def delete_session(
        self,
        *,
        session_id: int,
        organization_id: int,
    ) -> bool:
        """
        Delete a session and all its messages.
        """
        return await self.chat_repository.delete_session(
            session_id=session_id,
            organization_id=organization_id,
        )

    async def chat(
        self,
        *,
        organization_id: int,
        repository_id: int,
        message: str,
        session_id: int | None = None,
        user_id: int | None = None,
        conversation_history: Sequence[ChatMessageHistoryItem] | None = None,
    ) -> LLMResponse:
        """
        Answer a user question using repository architecture memory and intelligence.
        Persists interaction to database session.
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

        # Resolve or create persistent session
        session: ChatSession | None = None
        session_id_val: int | None = None
        try:
            if session_id is not None:
                session = await self.chat_repository.get_session(
                    session_id=session_id,
                    organization_id=organization_id,
                )
            if session is None:
                session = await self.chat_repository.get_or_create_default_session(
                    organization_id=organization_id,
                    repository_id=repository_id,
                    user_id=user_id,
                )
            if session is not None and hasattr(session, "id") and isinstance(session.id, int):
                session_id_val = session.id
                await self.chat_repository.add_message(
                    session_id=session_id_val,
                    role="user",
                    content=message,
                )
        except Exception as sess_exc:
            logger.warning("Failed to record chat session user message: %s", sess_exc)

        # 1. Retrieve latest completed analysis job & result
        analysis_jobs = await self.analysis_repository.get_by_repository(
            repository_id=repository_id,
            offset=0,
            limit=5,
        )
        latest_res = None
        for job in analysis_jobs:
            if job.status.value == "completed":
                latest_res = await self.analysis_repository.get_result_by_job(analysis_job_id=job.id)
                break

        # 2. Retrieve latest architecture snapshot
        snapshot = await self.architecture_repository.get_latest_by_repository(repository_id=repository_id)

        # Explicit Unanalyzed Repository State (Zero Hallucination Invariant)
        if latest_res is None and snapshot is None:
            content = (
                f"⚠️ **{repository.name} has not completed an architecture analysis yet.**\n\n"
                "Coodara grounds all architecture reasoning strictly in AST code models, dependency graphs, "
                "and architecture snapshots to prevent hallucination. "
                "Please run an analysis on this repository to enable architecture chat, coupling detection, "
                "and refactoring impact simulations."
            )
            response = LLMResponse(
                content=content,
                model="coodara-grounded-gate",
                confidence="UNAVAILABLE",
                session_id=session_id_val,
            )
            if session_id_val is not None:
                try:
                    await self.chat_repository.add_message(
                        session_id=session_id_val,
                        role="assistant",
                        content=content,
                        model=response.model,
                        confidence="UNAVAILABLE",
                    )
                except Exception as save_exc:
                    logger.warning("Failed to persist assistant unanalyzed message: %s", save_exc)
            return response

        # 3. Retrieve persistent V2 Architecture Memory & Evolution Events
        memory = await self.memory_repository.get_by_repository(repository_id=repository_id)
        memory_entries = list(await self.memory_repository.list_entries(
            repository_id=repository_id,
            offset=0,
            limit=50,
        ))

        # Rank memories relevant to user message
        scored = self.retriever.rank_entries(
            entries=memory_entries,
            query=message,
            limit=8,
        )
        ranked_entries = [s.entry for s in scored] if scored else memory_entries[:8]

        events = list(await self.memory_repository.list_events(
            repository_id=repository_id,
            offset=0,
            limit=10,
        ))

        # 4. Build Structured Architectural Context
        structured_ctx = self.context_engine.build_repository_context(
            repository=repository,
            analysis_result=latest_res,
            snapshot=snapshot,
            memory=memory,
            memory_entries=ranked_entries,
            events=events,
        )

        system_prompt = self.context_engine.format_system_prompt(structured_ctx)

        # 5. Build conversation message sequence
        llm_messages = [LLMMessage(role="system", content=system_prompt)]

        if conversation_history:
            for item in conversation_history[-8:]:  # keep last 8 turns for context window efficiency
                llm_messages.append(LLMMessage(role=item.role, content=item.content))

        llm_messages.append(LLMMessage(role="user", content=message))

        raw_response = await self.llm_manager.generate(
            messages=llm_messages,
            structured_context=structured_ctx,
        )

        sr_dict = None
        if raw_response.structured_reasoning:
            sr_dict = (
                raw_response.structured_reasoning.model_dump()
                if hasattr(raw_response.structured_reasoning, "model_dump")
                else (
                    raw_response.structured_reasoning
                    if isinstance(raw_response.structured_reasoning, dict)
                    else None
                )
            )

        resp = LLMResponse(
            content=raw_response.content,
            model=raw_response.model,
            usage=raw_response.usage,
            latency_ms=raw_response.latency_ms,
            finish_reason=raw_response.finish_reason,
            structured_reasoning=raw_response.structured_reasoning,
            session_id=session_id_val,
            confidence=raw_response.confidence or "HIGH",
        )

        if session_id_val is not None:
            try:
                await self.chat_repository.add_message(
                    session_id=session_id_val,
                    role="assistant",
                    content=raw_response.content,
                    model=raw_response.model,
                    confidence=resp.confidence,
                    structured_reasoning=sr_dict,
                )
            except Exception as save_exc:
                logger.warning("Failed to persist assistant message: %s", save_exc)

        return resp

    async def chat_organization(
        self,
        *,
        organization_id: int,
        message: str,
        session_id: int | None = None,
        user_id: int | None = None,
        conversation_history: Sequence[ChatMessageHistoryItem] | None = None,
    ) -> LLMResponse:
        """
        Answer a user question across the entire organization's repositories and architecture.
        Persists interaction to database session.
        """
        # Resolve or create persistent session
        session: ChatSession | None = None
        session_id_val: int | None = None
        try:
            if session_id is not None:
                session = await self.chat_repository.get_session(
                    session_id=session_id,
                    organization_id=organization_id,
                )
            if session is None:
                session = await self.chat_repository.get_or_create_default_session(
                    organization_id=organization_id,
                    repository_id=None,
                    user_id=user_id,
                )
            if session is not None and hasattr(session, "id") and isinstance(session.id, int):
                session_id_val = session.id
                await self.chat_repository.add_message(
                    session_id=session_id_val,
                    role="user",
                    content=message,
                )
        except Exception as sess_exc:
            logger.warning("Failed to record chat session user message: %s", sess_exc)

        repos = await self.repository_repository.list_by_organization(
            organization_id=organization_id,
            offset=0,
            limit=100,
        )

        repo_summaries = []
        analyzed_count = 0
        total_loc = 0
        scores = []

        for repo in repos:
            arch = await self.architecture_repository.get_latest_by_repository(repository_id=repo.id)
            score_text = "Awaiting initial analysis"
            if arch and arch.score and arch.score.score is not None:
                score_text = f"Architecture Score: {arch.score.score:.1f}/100"
                scores.append(arch.score.score)

            analyses = await self.analysis_repository.get_by_repository(repository_id=repo.id, offset=0, limit=1)
            tech_str = ""
            metrics_str = ""
            if analyses and analyses[0].status.value == "completed":
                analyzed_count += 1
                res = await self.analysis_repository.get_result_by_job(analysis_job_id=analyses[0].id)
                if res:
                    if res.technologies:
                        techs = [t.technology for t in res.technologies]
                        tech_str = f" | Tech: {', '.join(techs)}"
                    if res.metrics:
                        total_loc += res.metrics.loc
                        metrics_str = f" | {res.metrics.loc:,} LOC, {res.metrics.files} files"

            if not tech_str and repo.primary_language:
                tech_str = f" | Language: {repo.primary_language}"

            repo_summaries.append(f"- **{repo.name}** ({score_text}{metrics_str}{tech_str})")

        repo_summary_text = "\n".join(repo_summaries) if repo_summaries else "No repositories registered in this organization."
        avg_score_str = f"{sum(scores) / len(scores):.1f}/100" if scores else "N/A"

        system_prompt = f"""You are Coodara AI, the authoritative software architecture intelligence assistant.

### 🌐 Organization Portfolio Scope (Organization #{organization_id})
- **Total Repositories:** {len(repos)}
- **Analyzed Repositories:** {analyzed_count}
- **Total Lines of Code:** {total_loc:,}
- **Average Architecture Health:** {avg_score_str}

### 📦 Repository Breakdown:
{repo_summary_text}

### Mandatory Reasoning Rules:
1. Ground answers strictly in the verified portfolio telemetry above.
2. Structure answers following 3-Tier standard: [Observed] -> [Inferred] -> [Recommendation].
3. Include explicit Confidence rating.
""".strip()

        llm_messages = [LLMMessage(role="system", content=system_prompt)]

        if conversation_history:
            for item in conversation_history[-8:]:
                llm_messages.append(LLMMessage(role=item.role, content=item.content))

        llm_messages.append(LLMMessage(role="user", content=message))

        raw_response = await self.llm_manager.generate(
            messages=llm_messages,
        )

        resp = LLMResponse(
            content=raw_response.content,
            model=raw_response.model,
            usage=raw_response.usage,
            latency_ms=raw_response.latency_ms,
            finish_reason=raw_response.finish_reason,
            structured_reasoning=raw_response.structured_reasoning,
            session_id=session_id_val,
            confidence=raw_response.confidence or "HIGH",
        )

        if session_id_val is not None:
            try:
                await self.chat_repository.add_message(
                    session_id=session_id_val,
                    role="assistant",
                    content=raw_response.content,
                    model=raw_response.model,
                    confidence=resp.confidence,
                )
            except Exception as save_exc:
                logger.warning("Failed to persist assistant message: %s", save_exc)

        return resp