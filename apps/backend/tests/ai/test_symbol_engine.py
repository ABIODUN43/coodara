"""
Unit tests for Symbol & Call-Graph Intelligence Engine.
"""

from app.ai.tools.symbol_engine import (
    SymbolCallSite,
    SymbolDefinition,
    SymbolKind,
    build_symbol_call_graph,
    extract_symbols_from_source,
    trace_symbol_hierarchy,
)


def test_extract_symbols_from_python_source():
    code = '''
from abc import ABC, abstractmethod

class IOrderService(ABC):
    @abstractmethod
    def process_order(self, order_id: str) -> bool:
        pass

class OrderService(IOrderService):
    """Core domain order management service."""
    def __init__(self, repo):
        self.repo = repo

    def process_order(self, order_id: str) -> bool:
        self.repo.save(order_id)
        return True

@router.post("/orders")
async def create_order(payload: dict):
    svc = OrderService(repo=None)
    return svc.process_order("ord-123")
'''
    symbols, call_sites = extract_symbols_from_source("app/services/order_service.py", code)

    assert len(symbols) >= 3

    # Check interface
    i_service = next(s for s in symbols if s.name == "IOrderService")
    assert i_service.kind == SymbolKind.INTERFACE
    assert i_service.file_path == "app/services/order_service.py"

    # Check class & method
    order_svc = next(s for s in symbols if s.name == "OrderService")
    assert order_svc.kind == SymbolKind.CLASS
    assert "IOrderService" in order_svc.base_classes

    # Check route handler
    create_order_fn = next(s for s in symbols if s.name == "create_order")
    assert create_order_fn.kind == SymbolKind.ROUTE_HANDLER


def test_build_symbol_call_graph_and_hierarchy():
    symbols = [
        SymbolDefinition(
            name="OrderRouter",
            qualified_name="OrderRouter.create_order",
            kind=SymbolKind.ROUTE_HANDLER,
            file_path="app/api/orders.py",
            line_number=12,
            end_line=25,
        ),
        SymbolDefinition(
            name="OrderService",
            qualified_name="OrderService.process_order",
            kind=SymbolKind.METHOD,
            file_path="app/services/order_service.py",
            line_number=45,
            end_line=60,
        ),
        SymbolDefinition(
            name="OrderRepository",
            qualified_name="OrderRepository.insert",
            kind=SymbolKind.METHOD,
            file_path="app/repositories/order_repo.py",
            line_number=80,
            end_line=95,
        ),
    ]

    call_sites = [
        SymbolCallSite(
            caller_symbol="OrderRouter.create_order",
            callee_symbol="OrderService.process_order",
            caller_file="app/api/orders.py",
            callee_file="app/services/order_service.py",
            line_number=18,
        ),
        SymbolCallSite(
            caller_symbol="OrderService.process_order",
            callee_symbol="OrderRepository.insert",
            caller_file="app/services/order_service.py",
            callee_file="app/repositories/order_repo.py",
            line_number=52,
        ),
    ]

    graph = build_symbol_call_graph(symbols, call_sites)
    assert "OrderRouter.create_order" in graph
    assert len(graph["OrderRouter.create_order"]) == 1

    hierarchy = trace_symbol_hierarchy("OrderService.process_order", symbols, call_sites)
    assert hierarchy is not None
    assert len(hierarchy.incoming_callers) == 1
    assert hierarchy.incoming_callers[0].caller_symbol == "OrderRouter.create_order"
    assert len(hierarchy.outgoing_callees) == 1
    assert hierarchy.outgoing_callees[0].callee_symbol == "OrderRepository.insert"
