from pathlib import Path

from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


ROOT_DIR = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    """
    Application settings.

    Loaded from environment variables
    and the project root .env file.
    """

    model_config = SettingsConfigDict(
        env_file=ROOT_DIR / ".env",
        extra="ignore",
    )

    APP_NAME: str = "Coodara"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    GITHUB_CLIENT_ID: str
    GITHUB_CLIENT_SECRET: str
    GITHUB_CALLBACK_URL: str


settings = Settings()