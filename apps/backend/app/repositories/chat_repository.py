"""
Chat conversation and message repository.

Provides database access operations for persistent chat sessions and messages.
"""

from __future__ import annotations

import inspect
from collections.abc import Sequence
from datetime import datetime, timezone
from typing import Any

from app.models.chat import ChatMessage, ChatSession
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


class ChatRepository:
    """
    Persistence operations for ChatSession and ChatMessage entities.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_session(
        self,
        *,
        session_id: int,
        organization_id: int,
    ) -> ChatSession | None:
        """
        Retrieve a chat session ensuring organization tenancy.
        """
        stmt = (
            select(ChatSession)
            .where(
                ChatSession.id == session_id,
                ChatSession.organization_id == organization_id,
            )
            .options(selectinload(ChatSession.messages))
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if inspect.isawaitable(session):
            session = await session
        return session

    async def list_sessions(
        self,
        *,
        organization_id: int,
        repository_id: int | None = None,
        limit: int = 50,
    ) -> Sequence[ChatSession]:
        """
        List chat sessions for an organization, optionally filtered by repository.
        """
        stmt = (
            select(ChatSession)
            .where(ChatSession.organization_id == organization_id)
        )
        if repository_id is not None:
            stmt = stmt.where(ChatSession.repository_id == repository_id)

        stmt = stmt.order_by(desc(ChatSession.updated_at)).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

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
        session = ChatSession(
            organization_id=organization_id,
            repository_id=repository_id,
            user_id=user_id,
            title=title,
        )
        self.db.add(session)
        await self.db.flush()
        return session

    async def get_or_create_default_session(
        self,
        *,
        organization_id: int,
        repository_id: int | None = None,
        user_id: int | None = None,
    ) -> ChatSession:
        """
        Retrieve the most recent session for this org/repo or create a new one.
        """
        stmt = (
            select(ChatSession)
            .where(ChatSession.organization_id == organization_id)
        )
        if repository_id is not None:
            stmt = stmt.where(ChatSession.repository_id == repository_id)
        else:
            stmt = stmt.where(ChatSession.repository_id.is_(None))

        stmt = stmt.order_by(desc(ChatSession.updated_at)).limit(1)
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if inspect.isawaitable(session):
            session = await session

        if session is not None:
            return session

        title = "Architecture Chat"
        return await self.create_session(
            organization_id=organization_id,
            repository_id=repository_id,
            user_id=user_id,
            title=title,
        )

    async def add_message(
        self,
        *,
        session_id: int,
        role: str,
        content: str,
        model: str | None = None,
        confidence: str | None = None,
        structured_reasoning: dict[str, Any] | None = None,
    ) -> ChatMessage:
        """
        Append a message to an existing chat session and touch session's updated_at.
        """
        message = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            model=model,
            confidence=confidence,
            structured_reasoning=structured_reasoning,
        )
        self.db.add(message)

        # Update parent session's updated_at timestamp
        sess_stmt = select(ChatSession).where(ChatSession.id == session_id)
        sess_res = await self.db.execute(sess_stmt)
        parent_session = sess_res.scalar_one_or_none()
        if parent_session is not None:
            parent_session.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        return message

    async def list_messages(
        self,
        *,
        session_id: int,
        limit: int = 100,
    ) -> Sequence[ChatMessage]:
        """
        List messages belonging to a chat session in chronological order.
        """
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.id.asc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def delete_session(
        self,
        *,
        session_id: int,
        organization_id: int,
    ) -> bool:
        """
        Delete a session and all associated messages.
        """
        stmt = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.organization_id == organization_id,
        )
        result = await self.db.execute(stmt)
        session = result.scalar_one_or_none()
        if session is None:
            return False

        await self.db.delete(session)
        await self.db.flush()
        return True
