"""
Token service.

Responsible for:

- Secure refresh token generation

Owner:
    Founder / AI Lead

Last Updated:
    July 2026
"""

import secrets


class TokenService:

    @staticmethod
    def generate_refresh_token() -> str:
        """
        Generate a cryptographically
        secure refresh token.
        """

        return secrets.token_urlsafe(
            64
        )