"""
GitHub credential service.

Responsible for:

- Encrypting GitHub OAuth access tokens.
- Decrypting GitHub OAuth access tokens.
- Storing encrypted credentials on users.

Raw GitHub access tokens must never be logged,
returned through API responses, or placed in cookies.
"""

from __future__ import annotations

from app.core.config import settings
from app.models.user import User
from cryptography.fernet import Fernet, InvalidToken


class GitHubCredentialError(Exception):
    """Base exception for GitHub credential failures."""


class GitHubCredentialConfigurationError(
    GitHubCredentialError,
):
    """GitHub credential encryption is incorrectly configured."""


class GitHubCredentialDecryptionError(
    GitHubCredentialError,
):
    """A stored GitHub credential cannot be decrypted."""


class GitHubCredentialService:
    """
    Encrypt and decrypt GitHub OAuth credentials.

    The encryption key must be supplied through application
    configuration and must not be committed to source control.
    """

    def __init__(self) -> None:
        key = settings.GITHUB_TOKEN_ENCRYPTION_KEY

        if not key:
            raise GitHubCredentialConfigurationError(
                "GITHUB_TOKEN_ENCRYPTION_KEY is not configured.",
            )

        try:
            self._fernet = Fernet(
                key.encode(),
            )
        except (ValueError, TypeError) as exc:
            raise GitHubCredentialConfigurationError(
                "GITHUB_TOKEN_ENCRYPTION_KEY is invalid.",
            ) from exc

    def encrypt_token(
        self,
        access_token: str,
    ) -> str:
        """
        Encrypt a GitHub access token.
        """

        if not access_token:
            raise GitHubCredentialError(
                "GitHub access token cannot be empty.",
            )

        return self._fernet.encrypt(
            access_token.encode(),
        ).decode()

    def decrypt_token(
        self,
        encrypted_token: str,
    ) -> str:
        """
        Decrypt a stored GitHub access token.
        """

        try:
            return self._fernet.decrypt(
                encrypted_token.encode(),
            ).decode()

        except (
            InvalidToken,
            UnicodeDecodeError,
        ) as exc:
            raise GitHubCredentialDecryptionError(
                "Stored GitHub credential could not be decrypted.",
            ) from exc

    def store_access_token(
        self,
        user: User,
        access_token: str,
    ) -> None:
        """
        Encrypt and attach a GitHub access token to a User.

        The caller owns the database transaction.
        """

        user.github_access_token_encrypted = self.encrypt_token(access_token)

    def get_access_token(
        self,
        user: User,
    ) -> str:
        """
        Retrieve and decrypt a user's GitHub access token.
        """

        encrypted_token = user.github_access_token_encrypted

        if not encrypted_token:
            raise GitHubCredentialError(
                "GitHub authorization is not connected.",
            )

        return self.decrypt_token(
            encrypted_token,
        )

    def clear_access_token(
        self,
        user: User,
    ) -> None:
        """
        Remove the stored GitHub credential.
        """

        user.github_access_token_encrypted = None


github_credential_service = GitHubCredentialService()
