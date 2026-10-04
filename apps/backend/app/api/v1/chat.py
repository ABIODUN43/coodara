"""
Coodara AI Chat API.

Chat is organization and repository scoped with persistent multi-turn conversation memory.
"""

from __future__ import annotations

from typing import Annotated

from app.api.dependencies import OrganizationMemberDependency
from app.db.session import get_db
from app.schemas.chat import (
    ChatMessageHistoryItem,
    ChatMessageItemResponse,
    ChatMessageListResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
)
from app.services.chat_service import (
    ChatRepositoryNotFoundError,
    ChatSessionNotFoundError,
    ChatService,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
    Query,
    Response,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/organizations/{organization_id}",
    tags=["AI Chat"],
)


def _create_chat_service(
    db: AsyncSession,
) -> ChatService:
    """Create the Chat application service."""

    return ChatService(db)


@router.get(
    "/chat/sessions",
    response_model=ChatSessionListResponse,
)
async def list_chat_sessions(
    organization_id: Annotated[int, Path(gt=0)],
    member: OrganizationMemberDependency,
    repository_id: int | None = Query(None, description="Filter sessions by repository"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> ChatSessionListResponse:
    """
    List persistent chat sessions for an organization.
    """
    service = _create_chat_service(db)
    sessions = await service.list_sessions(
        organization_id=organization_id,
        repository_id=repository_id,
        limit=limit,
    )
    items = [
        ChatSessionResponse(
            id=s.id,
            organization_id=s.organization_id,
            repository_id=s.repository_id,
            title=s.title,
            created_at=s.created_at,
            updated_at=s.updated_at,
            message_count=len(s.messages) if hasattr(s, "messages") and s.messages else 0,
        )
        for s in sessions
    ]
    return ChatSessionListResponse(items=items, total=len(items))


@router.post(
    "/chat/sessions",
    response_model=ChatSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_chat_session(
    organization_id: Annotated[int, Path(gt=0)],
    member: OrganizationMemberDependency,
    repository_id: int | None = Query(None),
    title: str = Query("Architecture Chat"),
    db: AsyncSession = Depends(get_db),
) -> ChatSessionResponse:
    """
    Create a new persistent chat session.
    """
    service = _create_chat_service(db)
    session = await service.create_session(
        organization_id=organization_id,
        repository_id=repository_id,
        user_id=member.user_id,
        title=title,
    )
    await db.commit()
    return ChatSessionResponse(
        id=session.id,
        organization_id=session.organization_id,
        repository_id=session.repository_id,
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        message_count=0,
    )


@router.get(
    "/chat/sessions/{session_id}/messages",
    response_model=ChatMessageListResponse,
)
async def get_session_messages(
    organization_id: Annotated[int, Path(gt=0)],
    session_id: Annotated[int, Path(gt=0)],
    member: OrganizationMemberDependency,
    limit: int = Query(100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
) -> ChatMessageListResponse:
    """
    Retrieve message history for a persistent chat session.
    """
    service = _create_chat_service(db)
    try:
        messages = await service.list_session_messages(
            session_id=session_id,
            organization_id=organization_id,
            limit=limit,
        )
        items = [
            ChatMessageItemResponse(
                id=m.id,
                session_id=m.session_id,
                role=m.role,
                content=m.content,
                model=m.model,
                confidence=m.confidence,
                structured_reasoning=m.structured_reasoning,
                created_at=m.created_at,
            )
            for m in messages
        ]
        return ChatMessageListResponse(session_id=session_id, items=items)
    except ChatSessionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.delete(
    "/chat/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_chat_session(
    organization_id: Annotated[int, Path(gt=0)],
    session_id: Annotated[int, Path(gt=0)],
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """
    Delete a persistent chat session.
    """
    service = _create_chat_service(db)
    deleted = await service.delete_session(
        session_id=session_id,
        organization_id=organization_id,
    )
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat session not found.",
        )
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/chat",
    response_model=ChatMessageResponse,
)
async def chat_organization(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    request: ChatMessageRequest,
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ChatMessageResponse:
    """
    Ask Coodara AI a question about the organization's architecture and repositories.
    Persists interaction to a chat session.
    """

    service = _create_chat_service(db)
    response = await service.chat_organization(
        organization_id=organization_id,
        message=request.message,
        session_id=request.session_id,
        user_id=member.user_id,
        conversation_history=request.conversation_history,
    )
    await db.commit()

    return ChatMessageResponse(
        message=response.content,
        model=response.model,
        confidence=response.confidence or "HIGH",
        structured_reasoning=response.structured_reasoning,
        session_id=response.session_id,
    )


@router.post(
    "/repositories/{repository_id}/chat",
    response_model=ChatMessageResponse,
)
async def chat_repository(
    organization_id: Annotated[
        int,
        Path(gt=0),
    ],
    repository_id: Annotated[
        int,
        Path(gt=0),
    ],
    request: ChatMessageRequest,
    member: OrganizationMemberDependency,
    db: AsyncSession = Depends(get_db),
) -> ChatMessageResponse:
    """
    Ask Coodara AI a question about a specific repository.
    Persists interaction to a chat session.
    """

    service = _create_chat_service(db)

    try:
        response = await service.chat(
            organization_id=organization_id,
            repository_id=repository_id,
            message=request.message,
            session_id=request.session_id,
            user_id=member.user_id,
            conversation_history=request.conversation_history,
        )
        await db.commit()

        return ChatMessageResponse(
            message=response.content,
            model=response.model,
            confidence=response.confidence or "HIGH",
            structured_reasoning=response.structured_reasoning,
            session_id=response.session_id,
        )

    except ChatRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc