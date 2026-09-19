from __future__ import annotations

from app.architecture.classifier import ArchitectureClassifier


def test_classify_event_driven_architecture() -> None:
    classifier = ArchitectureClassifier()
    nodes = [
        "clients/producer/KafkaProducer.java",
        "clients/consumer/KafkaConsumer.java",
        "core/broker/TopicPartition.scala",
    ]
    result = classifier.classify(nodes)
    assert result.category == "event_driven"
    assert "Distributed Streaming" in result.pattern_name
    assert "Topic Partition Ring & Broker Cluster" in result.layers


def test_classify_clean_architecture() -> None:
    classifier = ArchitectureClassifier()
    nodes = [
        "domain/entities/order.py",
        "domain/usecases/process_payment.py",
        "adapters/controllers/order_controller.py",
        "infrastructure/database/order_repo.py",
    ]
    result = classifier.classify(nodes)
    assert result.category == "clean"
    assert "Hexagonal" in result.pattern_name or "Clean" in result.pattern_name
    assert "Domain Entities & Business Rules" in result.layers


def test_classify_layered_architecture() -> None:
    classifier = ArchitectureClassifier()
    nodes = [
        "app/controllers/user_controller.py",
        "app/services/user_service.py",
        "app/models/user.py",
    ]
    result = classifier.classify(nodes)
    assert result.category == "layered"
    assert "Layered" in result.pattern_name
