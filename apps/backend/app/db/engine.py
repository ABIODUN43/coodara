"""
Database engine configuration.
"""

from app.core.config import settings
from sqlalchemy.ext.asyncio import (
    create_async_engine,
)

engine = create_async_engine(
    settings.async_database_url,
    echo=settings.DEBUG,
)
