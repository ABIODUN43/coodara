"""
Structured logging and correlation ID tracking.

Provides:
- Context-aware structured logger with correlation IDs.
- Secret and credential redactor for logs and error traces.
"""

from __future__ import annotations

import contextvars
import json
import logging
import re
import sys
from datetime import datetime, timezone
from typing import Any

# Context variable holding the correlation ID for the active request/task
correlation_id_ctx: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "correlation_id",
    default=None,
)

# Common secret patterns to redact from logs
_SECRET_PATTERNS = [
    re.compile(r"gho_[A-Za-z0-9_]{20,}", re.IGNORECASE),
    re.compile(r"ghp_[A-Za-z0-9_]{20,}", re.IGNORECASE),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}", re.IGNORECASE),
    re.compile(r"sk-[A-Za-z0-9_-]{20,}", re.IGNORECASE),
    re.compile(r"AIza[0-9A-Za-z-_]{35}", re.IGNORECASE),
    re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/]+=*", re.IGNORECASE),
    re.compile(r"https?://[^:\s]+:[^@\s]+@github\.com", re.IGNORECASE),
]


def redact_secrets(text: str) -> str:
    """
    Sanitize text to redact credentials, API keys, and tokens.
    """
    if not text:
        return text

    sanitized = text
    for pattern in _SECRET_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)

    return sanitized


class StructuredJsonFormatter(logging.Formatter):
    """
    JSON formatter emitting machine-readable structured logs with correlation metadata.
    """

    def format(self, record: logging.LogRecord) -> str:
        correlation_id = correlation_id_ctx.get()

        log_data: dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": redact_secrets(record.getMessage()),
        }

        if correlation_id:
            log_data["correlation_id"] = correlation_id

        # Include custom extra fields if attached to the record
        if hasattr(record, "organization_id"):
            log_data["organization_id"] = getattr(record, "organization_id")
        if hasattr(record, "repository_id"):
            log_data["repository_id"] = getattr(record, "repository_id")
        if hasattr(record, "analysis_id"):
            log_data["analysis_id"] = getattr(record, "analysis_id")

        if record.exc_info:
            log_data["exception"] = redact_secrets(self.formatException(record.exc_info))

        return json.dumps(log_data)


def configure_logging(level: str = "INFO") -> None:
    """
    Initialize root logging configuration.
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers to avoid duplicate log entries
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    root_logger.addHandler(console_handler)
