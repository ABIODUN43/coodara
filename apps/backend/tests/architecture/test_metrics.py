from __future__ import annotations

from app.architecture.metrics import RobertMartinMetricsEngine


def test_metrics_calculation_coupling_and_instability() -> None:
    engine = RobertMartinMetricsEngine()
    nodes = ["core.py", "service_a.py", "service_b.py", "client.py"]
    # service_a and service_b both depend on core
    # client depends on service_a and service_b
    edges = [
        ("service_a.py", "core.py"),
        ("service_b.py", "core.py"),
        ("client.py", "service_a.py"),
        ("client.py", "service_b.py"),
    ]

    metrics = engine.compute_metrics(nodes, edges)

    # core has Ca=2, Ce=0 -> Instability = 0.0 (Maximally Stable)
    core_m = metrics["core.py"]
    assert core_m.ca == 2
    assert core_m.ce == 0
    assert core_m.instability == 0.0

    # client has Ca=0, Ce=2 -> Instability = 1.0 (Maximally Unstable)
    client_m = metrics["client.py"]
    assert client_m.ca == 0
    assert client_m.ce == 2
    assert client_m.instability == 1.0


def test_metrics_detects_hub_module() -> None:
    engine = RobertMartinMetricsEngine()
    nodes = ["hub.py"] + [f"in_{i}.py" for i in range(12)] + [f"out_{i}.py" for i in range(12)]
    edges = []
    for i in range(12):
        edges.append((f"in_{i}.py", "hub.py"))
        edges.append(("hub.py", f"out_{i}.py"))

    metrics = engine.compute_metrics(nodes, edges)
    assert metrics["hub.py"].is_hub is True
    assert metrics["hub.py"].ca == 12
    assert metrics["hub.py"].ce == 12
