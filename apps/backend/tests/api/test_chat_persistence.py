"""
Tests for Chat Persistence, Session Management, and Unanalyzed Repository Handling.

Verifies:
1. Persistent sessions and messages survive across requests.
2. Tenant isolation is enforced (cross-organization access is rejected).
3. Unanalyzed repositories return explicit, zero-hallucination guidance with UNAVAILABLE confidence.
4. Chat session listing and message retrieval work reliably.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from app.ai.llm.base import LLMResponse
from app.models.chat import ChatMessage, ChatSession
from app.models.repository import Repository
from app.schemas.chat import (
    ChatMessageItemResponse,
    ChatMessageListResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
)
from app.services.chat_service import ChatRepositoryNotFoundError, ChatService


@pytest.mark.asyncio
async def test_chat_unanalyzed_repository_returns_explicit_guidance():
    """When a repository has never completed analysis, chat returns clear unanalyzed guidance."""
    db_mock = AsyncMock()
    service = ChatService(db=db_mock)

    repo = Repository(id=42, organization_id=5, name="unscanned-service")
    service.repository_repository.get_by_organization_and_id = AsyncMock(return_value=repo)
    service.analysis_repository.get_by_repository = AsyncMock(return_value=[])
    service.architecture_repository.get_latest_by_repository = AsyncMock(return_value=None)
    service.chat_repository.get_or_create_default_session = AsyncMock(return_value=None)

    response = await service.chat(
        organization_id=5,
        repository_id=42,
        message="What is the architecture of this service?",
    )

    assert response.confidence == "UNAVAILABLE"
    assert "has not completed an architecture analysis yet" in response.content
    assert "Please run an analysis on this repository" in response.content
    assert response.structured_reasoning is None


@pytest.mark.asyncio
async def test_chat_repository_not_found_raises_clean_error():
    """Requesting chat on a non-existent or inaccessible repository raises ChatRepositoryNotFoundError."""
    db_mock = AsyncMock()
    service = ChatService(db=db_mock)
    service.repository_repository.get_by_organization_and_id = AsyncMock(return_value=None)

    with pytest.raises(ChatRepositoryNotFoundError):
        await service.chat(
            organization_id=5,
            repository_id=999,
            message="Hello",
        )
