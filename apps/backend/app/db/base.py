"""
Database base class.

All SQLAlchemy models inherit from Base.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass



