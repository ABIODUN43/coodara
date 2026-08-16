"""
Main API router.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from app.api.v1.auth import (
    router as auth_router,
)
from app.api.v1.organizations import (
    router as organizations_router,
)
from app.api.v1.repositories import (
    router as repositories_router,
)
from fastapi import APIRouter

api_router = APIRouter()


api_router.include_router(
    auth_router,
)

api_router.include_router(
    organizations_router,
)

api_router.include_router(
    repositories_router,
)