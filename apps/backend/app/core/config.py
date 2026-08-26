"""
Application configuration.
"""

from __future__ import annotations

from pathlib import Path

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

    # --------------------------------------------------------
    # Database
    # --------------------------------------------------------

    DATABASE_URL: str

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

    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_CALLBACK_URL: str

    # --------------------------------------------------------
    # Frontend
    # --------------------------------------------------------

    FRONTEND_URL: str

    # ------------------------------------------------------------
    #  Github token encryption
    # -------------------------------------------------------------

    GITHUB_TOKEN_ENCRYPTION_KEY: str

    # --------------------------------------------------------
    # AI / LLM
    # --------------------------------------------------------

    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_API_KEY: str


settings = Settings()
