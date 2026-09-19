"""
Main API router.
"""

from app.api.v1.analysis import (
    router as analysis_router,
)
from app.api.v1.architecture import (
    router as architecture_router,
    org_architecture_router,
)
from app.api.v1.auth import (
    router as auth_router,
)
from app.api.v1.chat import (
    router as chat_router,
)
from app.api.v1.memory import (
    router as memory_router,
)
from app.api.v1.organizations import (
    router as organizations_router,
)
from app.api.v1.overview import (
    router as overview_router,
)
from app.api.v1.repositories import (
    router as repositories_router,
)
from app.api.v1.settings import (
    router as settings_router,
)
from fastapi import APIRouter

api_router = APIRouter()

api_router.include_router(
    overview_router,
)

api_router.include_router(
    auth_router,
)

api_router.include_router(
    chat_router,
)

api_router.include_router(
    organizations_router,
)

api_router.include_router(
    repositories_router,
)

api_router.include_router(
    analysis_router,
)

api_router.include_router(
    architecture_router,
)

api_router.include_router(
    org_architecture_router,
)

api_router.include_router(
    memory_router,
)

api_router.include_router(
    settings_router,
)