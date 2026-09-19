"""
Unit tests for Inter-Procedural Request & Data-Flow Pipeline Engine.
"""

from app.ai.tools.dataflow_engine import (
    discover_request_pipelines,
    format_request_pipeline_diagram,
    trace_request_flow,
)
from app.ai.tools.symbol_engine import SymbolCallSite, SymbolDefinition, SymbolKind


def test_discover_and_trace_request_pipeline():
    symbols = [
        SymbolDefinition(
            name="create_order",
            qualified_name="create_order",
            kind=SymbolKind.ROUTE_HANDLER,
            file_path="app/api/v1/orders.py",
            line_number=20,
            end_line=35,
            decorators=['@router.post("/api/v1/orders")'],
        ),
        SymbolDefinition(
            name="OrderService",
            qualified_name="OrderService.process_checkout",
            kind=SymbolKind.METHOD,
            file_path="app/services/order_service.py",
            line_number=50,
            end_line=75,
        ),
        SymbolDefinition(
            name="OrderRepository",
            qualified_name="OrderRepository.insert",
            kind=SymbolKind.METHOD,
            file_path="app/repositories/order_repo.py",
            line_number=90,
            end_line=105,
        ),
        SymbolDefinition(
            name="Order",
            qualified_name="Order",
            kind=SymbolKind.ORM_MODEL,
            file_path="app/models/order.py",
            line_number=10,
            end_line=40,
        ),
    ]

    call_sites = [
        SymbolCallSite(
            caller_symbol="create_order",
            callee_symbol="OrderService.process_checkout",
            caller_file="app/api/v1/orders.py",
            callee_file="app/services/order_service.py",
            line_number=28,
        ),
        SymbolCallSite(
            caller_symbol="OrderService.process_checkout",
            callee_symbol="OrderRepository.insert",
            caller_file="app/services/order_service.py",
            callee_file="app/repositories/order_repo.py",
            line_number=65,
        ),
    ]

    pipelines = discover_request_pipelines(symbols, call_sites)
    assert len(pipelines) == 1

    p = pipelines[0]
    assert p.endpoint == "POST /api/v1/orders"
    assert p.http_method == "POST"
    assert len(p.stages) >= 3

    # Check diagram formatting
    diagram = format_request_pipeline_diagram(p)
    assert "HTTP Ingress Client (POST /api/v1/orders)" in diagram
    assert "Presentation" in diagram
    assert "Business Logic" in diagram

    # Trace by query
    matched = trace_request_flow("orders", symbols, call_sites)
    assert matched is not None
    assert matched.endpoint == "POST /api/v1/orders"
