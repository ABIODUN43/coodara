"""
Database base class.

All SQLAlchemy models inherit from Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass

# Import models so SQLAlchemy registers them

from app.models.user import User
from app.models.session import Session
from app.models.organization import Organization
from app.models.repository import Repository


