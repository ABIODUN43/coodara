# app/models/enums/organization_role.py

"""
Organization role definitions.

These roles control access to organization
resources throughout the platform.
"""

from enum import Enum


class OrganizationRole(str, Enum):
    """
    Organization membership roles.

    OWNER:
        Full control.

    ADMIN:
        Management permissions.

    MEMBER:
        Standard access.
    """

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"