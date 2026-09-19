"""
Application configuration.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)

ROOT_DIR = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    """

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --------------------------------------------------------
    # Application
    # --------------------------------------------------------

    APP_NAME: str = "Coodara"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------

    DATABASE_URL: str

    @property
    def async_database_url(self) -> str:
        """Resolve database URL to ensure asyncpg driver is used for async SQLAlchemy."""
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://") and "+asyncpg" not in url:
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    # --------------------------------------------------------
    # Redis
    # --------------------------------------------------------

    REDIS_URL: str

    # --------------------------------------------------------
    # JWT
    # --------------------------------------------------------

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # --------------------------------------------------------
    # Refresh sessions
    # --------------------------------------------------------

    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --------------------------------------------------------
    # GitHub OAuth
    # --------------------------------------------------------

    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_CALLBACK_URL: str = "http://localhost:5173/auth/callback"

    # --------------------------------------------------------
    # Frontend
    # --------------------------------------------------------

    FRONTEND_URL: str = "http://localhost:5173"

    # ------------------------------------------------------------
    # GitHub token encryption
    # -------------------------------------------------------------

    GITHUB_TOKEN_ENCRYPTION_KEY: str

    # --------------------------------------------------------
    # Celery / Queue
    # --------------------------------------------------------

    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None
    CELERY_TASK_SOFT_TIME_LIMIT: int = 600
    CELERY_TASK_TIME_LIMIT: int = 900
    CELERY_WORKER_CONCURRENCY: int = 2

    @property
    def celery_broker_url(self) -> str:
        """Resolve Celery broker URL, defaulting to REDIS_URL."""
        return self.CELERY_BROKER_URL or self.REDIS_URL

    @property
    def celery_result_backend(self) -> str:
        """Resolve Celery result backend URL, defaulting to REDIS_URL."""
        return self.CELERY_RESULT_BACKEND or self.REDIS_URL

    # --------------------------------------------------------
    # Analysis Safety & Resource Bounds
    # --------------------------------------------------------

    ANALYSIS_MAX_REPO_SIZE_BYTES: int = 250 * 1024 * 1024  # 250 MB
    ANALYSIS_MAX_FILE_SIZE_BYTES: int = 5 * 1024 * 1024    # 5 MB
    ANALYSIS_MAX_FILES_COUNT: int = 15000                  # 15,000 files
    ANALYSIS_TIMEOUT_SECONDS: int = 600
    REPOSITORIES_STORAGE_PATH: str = "data/repositories"

    # --------------------------------------------------------
    # AI / LLM Configuration
    # --------------------------------------------------------

    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: str | None = None

    OPENAI_API_KEY: str | None = None
    GEMINI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None

    AI_MAX_TOKENS: int = 4096
    AI_REQUEST_TIMEOUT_SECONDS: int = 45
    AI_MAX_RETRIES: int = 3
    AI_ALLOW_FALLBACK: bool = True


settings = Settings()
