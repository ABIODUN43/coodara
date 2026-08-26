"""
Coodara AI Chat API.

Chat is organization and repository scoped.

Authorization:

    authenticated user
        ↓
    organization membership
        ↓
    ChatService
        ↓
    repository validation
        ↓
    Coodara context
        ↓
    LLM
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
    prefix=(
        "/organizations/{organization_id}"
        "/repositories/{repository_id}"
        "/chat"
    ),
    tags=["AI Chat"],
)


def _create_chat_service(
    db: AsyncSession,
) -> ChatService:
    """Create the Chat application service."""

    return ChatService(db)


@router.post(
    "",
    response_model=ChatMessageResponse,
)
async def chat(
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
    Ask Coodara a question about a repository.
    """

    service = _create_chat_service(db)

    try:
        response = await service.chat(
            organization_id=organization_id,
            repository_id=repository_id,
            message=request.message,
        )

        return ChatMessageResponse(
            message=response.content,
            model=response.model,
        )

    except ChatRepositoryNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repository not found.",
        ) from exc