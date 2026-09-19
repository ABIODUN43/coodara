"""
API schemas for Coodara AI Chat.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class ChatMessageHistoryItem(BaseModel):
    """Previous turn in conversational history."""

    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text")


class ChatMessageRequest(BaseModel):
    """Incoming user message with multi-turn conversation memory."""

    message: str = Field(
        min_length=1,
        max_length=8000,
    )
    conversation_history: list[ChatMessageHistoryItem] = Field(
        default_factory=list,
        description="Chronological recent message history for pronoun/context resolution",
    )


class ObservedItem(BaseModel):
    """Fact directly established by repository evidence."""

    statement: str
    evidence_ids: list[str] = Field(default_factory=list)


class StructuralImpactItem(BaseModel):
    """Deterministic structural consequence on dependency graph."""

    statement: str
    type: str = "direct"  # "direct" | "indirect"
    entity_ids: list[str] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class InferenceItem(BaseModel):
    """Inferred architectural consequence using conditional language."""

    statement: str
    basis: list[str] = Field(default_factory=list)
    language: str = "likely"


class UnknownItem(BaseModel):
    """What the available evidence cannot establish."""

    statement: str
    reason: str


class ReasoningConfidence(BaseModel):
    """Separated epistemic confidence dimensions."""

    structural: str = "HIGH"  # "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
    evidence: str = "HIGH"    # "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN"
    runtime: str = "UNKNOWN"  # "UNKNOWN" when telemetry is unavailable


class EvidenceItem(BaseModel):
    """Concrete repository evidence citation with provenance."""

    id: str
    repository_path: str
    entity_id: str
    commit_sha: str | None = None
    relationship: str
    why_supports: str


class AlternativeOption(BaseModel):
    """Separate intervention alternative (e.g. remove vs compatible refactor)."""

    id: str
    name: str
    intervention: str
    summary: str
    direct_breakage_count: int = 0
    indirect_impact_count: int = 0


class ActionItem(BaseModel):
    """Interactive next action for the user."""

    type: str  # "view_affected" | "show_paths" | "simulate_removal" | "simulate_refactor" | "open_code_studio"
    label: str
    target: str | None = None
    intervention: str | None = None
    file_path: str | None = None


class StructuredReasoningResult(BaseModel):
    """Structured architectural reasoning contract for chat and simulation."""

    summary: str
    target_component: str | None = None
    candidates: list[str] = Field(default_factory=list, description="Ambiguous candidates if tied")
    observed: list[ObservedItem] = Field(default_factory=list)
    structural_impacts: list[StructuralImpactItem] = Field(default_factory=list)
    inferences: list[InferenceItem] = Field(default_factory=list)
    unknowns: list[UnknownItem] = Field(default_factory=list)
    confidence: ReasoningConfidence = Field(default_factory=ReasoningConfidence)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    alternatives: list[AlternativeOption] = Field(default_factory=list)
    actions: list[ActionItem] = Field(default_factory=list)


class ChatMessageResponse(BaseModel):
    """AI response with evidence, confidence rating, and structured reasoning."""

    message: str
    model: str
    evidence: list[str] = Field(default_factory=list)
    confidence: str = Field(default="HIGH")
    structured_reasoning: StructuredReasoningResult | None = None