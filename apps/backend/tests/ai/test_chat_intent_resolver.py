"""
Tests for Multi-Turn Intent & Reference Resolver.
"""

from app.ai.chat.intent_resolver import ChatIntent, ChatIntentResolver
from app.schemas.chat import ChatMessageHistoryItem


def test_intent_resolver_system_capabilities():
    resolver = ChatIntentResolver()
    resolved = resolver.resolve(query="Tell me your capacity and what you can do")
    assert resolved.intent == ChatIntent.SYSTEM_CAPABILITIES


def test_intent_resolver_portfolio_stats():
    resolver = ChatIntentResolver()
    resolved = resolver.resolve(query="Now for this organization how many repo have you analyzed")
    assert resolved.intent == ChatIntent.PORTFOLIO_STATS


def test_intent_resolver_module_importance():
    resolver = ChatIntentResolver()
    resolved = resolver.resolve(query="Which modules are most important to the architecture, and why?")
    assert resolved.intent == ChatIntent.MODULE_IMPORTANCE

    resolved2 = resolver.resolve(query="What are the critical components in this repository?")
    assert resolved2.intent == ChatIntent.MODULE_IMPORTANCE


def test_intent_resolver_structure():
    resolver = ChatIntentResolver()
    resolved = resolver.resolve(query="Explain the module dependency structure and how services connect.")
    assert resolved.intent == ChatIntent.EXPLAIN_STRUCTURE


def test_intent_resolver_simulation():
    resolver = ChatIntentResolver()
    resolved = resolver.resolve(
        query="What happens if I remove architecture-service?",
        known_components=["architecture-service", "api-service"],
    )
    assert resolved.intent == ChatIntent.SIMULATE_CHANGE
    assert resolved.target_component == "architecture-service"


def test_intent_resolver_multi_turn_pronoun():
    resolver = ChatIntentResolver()
    history = [
        ChatMessageHistoryItem(role="user", content="Why is `architecture-service` tightly coupled?"),
        ChatMessageHistoryItem(role="assistant", content="architecture-service has high fan-in and fan-out."),
    ]

    # Follow-up question with pronoun "it"
    resolved = resolver.resolve(
        query="How can I fix it?",
        conversation_history=history,
        known_components=["architecture-service", "api-service"],
    )

    assert resolved.intent == ChatIntent.REFACTORING_ROADMAP
    assert resolved.target_component == "architecture-service"
    assert resolved.is_follow_up is True
