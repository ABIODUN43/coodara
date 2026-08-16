"""
Tests for GitHub credential encryption.
"""

from unittest.mock import patch

import pytest
from app.services.github_credential_service import (
    GitHubCredentialConfigurationError,
    GitHubCredentialDecryptionError,
    GitHubCredentialError,
    GitHubCredentialService,
)

TEST_KEY = "2XeMiqU0zWnlKaAbBOZPzPfx768h-vYyohpI3EosINk="

def make_service() -> GitHubCredentialService:
    with patch(
        "app.services.github_credential_service.settings"
    ) as mock_settings:
        mock_settings.GITHUB_TOKEN_ENCRYPTION_KEY = TEST_KEY

        return GitHubCredentialService()


def test_service_can_encrypt_and_decrypt_token() -> None:
    service = make_service()

    encrypted = service.encrypt_token(
        "gho_test_token",
    )

    assert encrypted != "gho_test_token"

    decrypted = service.decrypt_token(
        encrypted,
    )

    assert decrypted == "gho_test_token"


def test_encrypt_token_rejects_empty_token() -> None:
    service = make_service()

    with pytest.raises(
        GitHubCredentialError,
        match="cannot be empty",
    ):
        service.encrypt_token("")


def test_encrypt_token_produces_different_ciphertext() -> None:
    service = make_service()

    encrypted_one = service.encrypt_token(
        "gho_same_token",
    )

    encrypted_two = service.encrypt_token(
        "gho_same_token",
    )

    assert encrypted_one != encrypted_two


def test_decrypt_invalid_token_raises_error() -> None:
    service = make_service()

    with pytest.raises(
        GitHubCredentialDecryptionError,
        match="could not be decrypted",
    ):
        service.decrypt_token(
            "not-valid-fernet-token",
        )


def test_missing_encryption_key_raises_configuration_error() -> None:
    with patch(
        "app.services.github_credential_service.settings"
    ) as mock_settings:
        mock_settings.GITHUB_TOKEN_ENCRYPTION_KEY = None

        with pytest.raises(
            GitHubCredentialConfigurationError,
            match="not configured",
        ):
            GitHubCredentialService()


def test_invalid_encryption_key_raises_configuration_error() -> None:
    with patch(
        "app.services.github_credential_service.settings"
    ) as mock_settings:
        mock_settings.GITHUB_TOKEN_ENCRYPTION_KEY = "invalid-key"

        with pytest.raises(
            GitHubCredentialConfigurationError,
            match="invalid",
        ):
            GitHubCredentialService()


def test_store_access_token_encrypts_token() -> None:
    service = make_service()

    class FakeUser:
        github_access_token_encrypted = None

    user = FakeUser()

    service.store_access_token(
        user,
        "gho_test_token",
    )

    assert user.github_access_token_encrypted is not None
    assert user.github_access_token_encrypted != "gho_test_token"


def test_get_access_token_decrypts_token() -> None:
    service = make_service()

    class FakeUser:
        github_access_token_encrypted = None

    user = FakeUser()

    service.store_access_token(
        user,
        "gho_test_token",
    )

    assert (
        service.get_access_token(user)
        == "gho_test_token"
    )


def test_get_access_token_without_connection_raises_error() -> None:
    service = make_service()

    class FakeUser:
        github_access_token_encrypted = None

    user = FakeUser()

    with pytest.raises(
        GitHubCredentialError,
        match="authorization is not connected",
    ):
        service.get_access_token(user)


def test_clear_access_token() -> None:
    service = make_service()

    class FakeUser:
        github_access_token_encrypted = None

    user = FakeUser()

    service.store_access_token(
        user,
        "gho_test_token",
    )

    assert user.github_access_token_encrypted is not None

    service.clear_access_token(user)

    assert user.github_access_token_encrypted is None

