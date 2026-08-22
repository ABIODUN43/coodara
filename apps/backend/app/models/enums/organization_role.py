"""
Organization role definitions.
"""

from enum import Enum


class OrganizationRole(str, Enum):
    """
    Roles available within an organization.
    """

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
