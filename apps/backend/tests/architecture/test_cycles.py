from __future__ import annotations

from app.architecture.cycles import TarjanCycleDetector


def test_tarjan_cycle_detector_acyclic() -> None:
    detector = TarjanCycleDetector()
    nodes = ["a.py", "b.py", "c.py"]
    edges = [("a.py", "b.py"), ("b.py", "c.py")]

    cycles = detector.detect_cycles(nodes, edges)
    assert len(cycles) == 0


def test_tarjan_cycle_detector_simple_2_cycle() -> None:
    detector = TarjanCycleDetector()
    nodes = ["order.py", "payment.py", "user.py"]
    edges = [
        ("order.py", "payment.py"),
        ("payment.py", "order.py"),
        ("order.py", "user.py"),
    ]

    cycles = detector.detect_cycles(nodes, edges)
    assert len(cycles) == 1
    c = cycles[0]
    assert c.length == 2
    assert set(c.nodes) == {"order.py", "payment.py"}
    assert c.path[0] == c.path[-1]


def test_tarjan_cycle_detector_3_node_cycle() -> None:
    detector = TarjanCycleDetector()
    nodes = ["a.py", "b.py", "c.py", "d.py"]
    edges = [
        ("a.py", "b.py"),
        ("b.py", "c.py"),
        ("c.py", "a.py"),
        ("c.py", "d.py"),
    ]

    cycles = detector.detect_cycles(nodes, edges)
    assert len(cycles) == 1
    c = cycles[0]
    assert c.length == 3
    assert set(c.nodes) == {"a.py", "b.py", "c.py"}


def test_tarjan_cycle_detector_self_loop() -> None:
    detector = TarjanCycleDetector()
    nodes = ["self_recursive.py", "helper.py"]
    edges = [("self_recursive.py", "self_recursive.py")]

    cycles = detector.detect_cycles(nodes, edges)
    assert len(cycles) == 1
    assert cycles[0].length == 1
    assert cycles[0].nodes == ("self_recursive.py",)
