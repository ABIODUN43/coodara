"""
Coodara AI Chat API.

Chat is organization and repository scoped with multi-turn conversation memory.
"""

from __future__ import annotations

from typing import Annotated

from app.api.dependencies import OrganizationMemberDependency
from app.db.session import get_db
from app.schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
)
from app.services.chat_service import (
    ChatRepositoryNotFoundError,
    ChatService,
)
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Path,
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
    """

    service = _create_chat_service(db)
    response = await service.chat_organization(
        organization_id=organization_id,
        message=request.message,
        conversation_history=request.conversation_history,
    )

    return ChatMessageResponse(
        message=response.content,
        model=response.model,
        confidence="HIGH",
        structured_reasoning=response.structured_reasoning,
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
    """

    service = _create_chat_service(db)

    try:
        response = await service.chat(
            organization_id=organization_id,
            repository_id=repository_id,
            message=request.message,
            conversation_history=request.conversation_history,
        )

        return ChatMessageResponse(
            message=response.content,
            model=response.model,
            confidence="HIGH",
            structured_reasoning=response.structured_reasoning,
        )

    except ChatRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc