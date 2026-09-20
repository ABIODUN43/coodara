"""
Coodara API application entrypoint.

Provides:
- FastAPI router mounting.
- CORS configuration.
- Request Correlation ID middleware.
- Liveness (/livez, /healthz) and Readiness (/readyz) probes.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Any

from app.api.router import api_router
from app.core.config import settings
from app.core.logging import correlation_id_ctx, redact_secrets
from app.db.session import get_db
from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

_frontend_url = settings.FRONTEND_URL.strip()
_cors_origins = list({_frontend_url, _frontend_url.rstrip("/")}) if _frontend_url else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catch-all handler for unexpected internal exceptions.
    Logs the underlying error server-side for diagnostics while returning a
    safe, generic HTTP 500 JSON response with CORS headers intact so cross-origin
    clients do not encounter an opaque browser 'Network Error'.
    """
    if isinstance(exc, (HTTPException, StarletteHTTPException, RequestValidationError)):
        raise exc

    logger.exception(
        "Unhandled server error processing %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    headers: dict[str, str] = {}
    origin = request.headers.get("Origin") or request.headers.get("origin")
    if origin and (_cors_origins == ["*"] or origin in _cors_origins or origin.rstrip("/") in _cors_origins):
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Vary"] = "Origin"

    request_id = request.headers.get("X-Request-ID")
    if request_id:
        headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error."},
        headers=headers,
    )


@app.middleware("http")
async def correlation_id_middleware(request: Request, call_next: Any) -> Response:
    """
    Attach or extract correlation ID for request tracing across services.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    token = correlation_id_ctx.set(request_id)
    try:
        response: Response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        correlation_id_ctx.reset(token)


app.include_router(
    api_router,
    prefix="/api/v1",
)


@app.get(
    "/health",
    tags=["Health"],
)
@app.get(
    "/healthz",
    tags=["Health"],
)
@app.get(
    "/livez",
    tags=["Health"],
)
async def health_check() -> dict[str, str]:
    """
    Return API liveness status.
    """
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


@app.get(
    "/readyz",
    tags=["Health"],
)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """
    Readiness probe verifying PostgreSQL and Redis connections.
    """
    checks: dict[str, str] = {}
    is_ready = True

    # 1. Check PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["postgres"] = "ok"
    except Exception as exc:
        checks["postgres"] = f"error: {redact_secrets(str(exc))}"
        is_ready = False

    # 2. Check Redis
    try:
        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis.ping()
        await redis.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        checks["redis"] = f"error: {redact_secrets(str(exc))}"
        is_ready = False

    if not is_ready:
        return Response(
            content=str({"status": "unhealthy", "checks": checks}),
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            media_type="application/json",
        )

    return {
        "status": "ready",
        "service": settings.APP_NAME,
        "checks": checks,
    }
