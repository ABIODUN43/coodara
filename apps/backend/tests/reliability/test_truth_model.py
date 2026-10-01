"""
Tests for Coodara Truth Model Formalization (Phase 2).

Verifies the epistemic classifications and truth invariants:
- OBSERVED
- DERIVED
- INFERRED
- UNKNOWN
- PROPOSED
"""

import pytest

from app.architecture.models import TruthClaim, TruthStatus


def test_truth_status_values():
    assert TruthStatus.OBSERVED == "OBSERVED"
    assert TruthStatus.DERIVED == "DERIVED"
    assert TruthStatus.INFERRED == "INFERRED"
    assert TruthStatus.UNKNOWN == "UNKNOWN"
    assert TruthStatus.PROPOSED == "PROPOSED"


def test_proposed_cannot_be_classified_as_observed():
    """Invariant: A proposed design or interface must NEVER be classified as OBSERVED."""
    claim = TruthClaim(
        claim="Introduce IinitpyPort interface",
        status=TruthStatus.PROPOSED,
        rationale="Port/Adapter recommendation",
    )
    assert claim.is_proposed is True
    assert claim.is_fact is False
    assert claim.status != TruthStatus.OBSERVED


def test_observed_fact_invariant():
    """Invariant: Repository facts directly present in files/AST are OBSERVED."""
    claim = TruthClaim(
        claim="File apps/backend/__init__.py exists in repository",
        status=TruthStatus.OBSERVED,
        evidence_citation="apps/backend/__init__.py",
    )
    assert claim.is_fact is True
    assert claim.is_proposed is False
    assert claim.is_derived is False


def test_derived_metric_invariant():
    """Invariant: Values calculated deterministically from graph edges are DERIVED."""
    claim = TruthClaim(
        claim="Component has 0 inbound callers and Robert Martin instability I = 0.0",
        status=TruthStatus.DERIVED,
        evidence_citation="Graph edges count",
    )
    assert claim.is_derived is True
    assert claim.is_fact is False


def test_unknown_state_not_conflated_with_zero():
    """
    Invariant: Absence of telemetry or metadata is UNKNOWN,
    not established numerical zero or fabricated identity.
    """
    runtime_claim = TruthClaim(
        claim="Runtime traffic through endpoint",
        status=TruthStatus.UNKNOWN,
        rationale="Static analysis only; no runtime telemetry attached",
    )
    assert runtime_claim.is_unknown is True
    assert runtime_claim.status != TruthStatus.OBSERVED
    assert runtime_claim.status != TruthStatus.DERIVED

    team_claim = TruthClaim(
        claim="Team ownership for orphan module",
        status=TruthStatus.UNKNOWN,
        rationale="No CODEOWNERS or metadata found in repository",
    )
    assert team_claim.is_unknown is True
