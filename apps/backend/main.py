"""
Coodara API Application.

Main FastAPI entrypoint.

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

from fastapi import FastAPI

from app.core.config import settings
from app.api.router import api_router


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(api_router)


@app.get(
    "/health",
    tags=["Health"],
)
async def health_check() -> dict:
    """
    Health check endpoint.
    """

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
    }