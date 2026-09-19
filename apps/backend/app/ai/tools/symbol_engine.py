"""
Symbol & Call-Graph Intelligence Engine for Coodara AI (Silicon Valley 95%+ Standard).

Resolves code from file-level import edges to exact symbol-level call trees:
- Class, method, function, route handler, and ORM model definitions with exact file line numbers.
- Inter-symbol call sites (Caller.method -> Callee.method).
- Inheritance and interface realization trees.
"""

from __future__ import annotations

import ast
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any, Sequence


class SymbolKind(StrEnum):
    """Classification of code symbols."""

    CLASS = "class"
    FUNCTION = "function"
    METHOD = "method"
    INTERFACE = "interface"
    ROUTE_HANDLER = "route_handler"
    ORM_MODEL = "orm_model"
    SCHEMA = "schema"


@dataclass(frozen=True)
class SymbolDefinition:
    """Exact code symbol definition with line-level provenance."""

    name: str
    qualified_name: str  # e.g. "ChatService.chat" or "OrderRouter.create_order"
    kind: SymbolKind
    file_path: str
    line_number: int
    end_line: int
    signature: str = ""
    decorators: list[str] = field(default_factory=list)
    docstring: str = ""
    base_classes: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class SymbolCallSite:
    """Directed invocation between two symbols with exact line number."""

    caller_symbol: str
    callee_symbol: str
    caller_file: str
    callee_file: str
    line_number: int
    call_type: str = "direct_call"  # "direct_call", "instantiation", "route_dispatch", "super_call"


@dataclass(frozen=True)
class SymbolHierarchyResult:
    """Call and inheritance hierarchy for a specific symbol."""

    symbol: SymbolDefinition
    incoming_callers: list[SymbolCallSite]
    outgoing_callees: list[SymbolCallSite]
    subclasses: list[str]
    superclasses: list[str]


class SymbolExtractor(ast.NodeVisitor):
    """
    AST Visitor that extracts classes, methods, functions, decorators, and call sites from Python code.
    """

    def __init__(self, file_path: str) -> None:
        self.file_path = file_path
        self.symbols: list[SymbolDefinition] = []
        self.call_sites: list[SymbolCallSite] = []
        self._current_class: str | None = None
        self._current_function: str | None = None

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        bases = [ast.unparse(b) for b in node.bases]
        decorators = [ast.unparse(d) for d in node.decorator_list]
        doc = ast.get_docstring(node) or ""

        kind = SymbolKind.CLASS
        if any("Base" in b or "Model" in b for b in bases):
            kind = SymbolKind.ORM_MODEL if any("Base" in b for b in bases) else SymbolKind.SCHEMA
        elif "ABC" in bases or "Protocol" in bases or node.name.startswith("I"):
            kind = SymbolKind.INTERFACE

        sym = SymbolDefinition(
            name=node.name,
            qualified_name=node.name,
            kind=kind,
            file_path=self.file_path,
            line_number=node.lineno,
            end_line=getattr(node, "end_lineno", node.lineno),
            signature=f"class {node.name}({', '.join(bases)})",
            decorators=decorators,
            docstring=doc,
            base_classes=bases,
        )
        self.symbols.append(sym)

        old_class = self._current_class
        self._current_class = node.name
        self.generic_visit(node)
        self._current_class = old_class

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._process_func(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._process_func(node, is_async=True)

    def _process_func(self, node: ast.FunctionDef | ast.AsyncFunctionDef, is_async: bool) -> None:
        decorators = [ast.unparse(d) for d in node.decorator_list]
        doc = ast.get_docstring(node) or ""

        # Determine qualified name and kind
        if self._current_class:
            qname = f"{self._current_class}.{node.name}"
            kind = SymbolKind.METHOD
        else:
            qname = node.name
            is_route = any("route" in d or "get" in d or "post" in d or "put" in d or "delete" in d for d in decorators)
            kind = SymbolKind.ROUTE_HANDLER if is_route else SymbolKind.FUNCTION

        args_str = ast.unparse(node.args)
        returns_str = f" -> {ast.unparse(node.returns)}" if node.returns else ""
        async_prefix = "async " if is_async else ""
        sig = f"{async_prefix}def {node.name}({args_str}){returns_str}"

        sym = SymbolDefinition(
            name=node.name,
            qualified_name=qname,
            kind=kind,
            file_path=self.file_path,
            line_number=node.lineno,
            end_line=getattr(node, "end_lineno", node.lineno),
            signature=sig,
            decorators=decorators,
            docstring=doc,
        )
        self.symbols.append(sym)

        old_func = self._current_function
        self._current_function = qname
        self.generic_visit(node)
        self._current_function = old_func

    def visit_Call(self, node: ast.Call) -> None:
        if self._current_function:
            callee_name = ast.unparse(node.func)
            # Normalize callee name
            if "(" not in callee_name and len(callee_name) < 100:
                call_site = SymbolCallSite(
                    caller_symbol=self._current_function,
                    callee_symbol=callee_name,
                    caller_file=self.file_path,
                    callee_file="",  # resolved during cross-file graph linking
                    line_number=node.lineno,
                    call_type="direct_call",
                )
                self.call_sites.append(call_site)
        self.generic_visit(node)


def extract_symbols_from_source(file_path: str, code_text: str) -> tuple[list[SymbolDefinition], list[SymbolCallSite]]:
    """
    Extract all symbol definitions and invocation call-sites from a source file.
    """
    try:
        tree = ast.parse(code_text, filename=file_path)
        extractor = SymbolExtractor(file_path=file_path)
        extractor.visit(tree)
        return extractor.symbols, extractor.call_sites
    except Exception:
        # Fallback for non-Python or syntax-error files
        return _extract_symbols_heuristic(file_path, code_text)


def _extract_symbols_heuristic(file_path: str, code_text: str) -> tuple[list[SymbolDefinition], list[SymbolCallSite]]:
    """Heuristic regex fallback symbol extraction for JS/TS/Go."""
    symbols: list[SymbolDefinition] = []
    lines = code_text.splitlines()

    for idx, line in enumerate(lines, start=1):
        line_clean = line.strip()
        if line_clean.startswith("class ") or line_clean.startswith("export class "):
            parts = line_clean.split()
            name = parts[1].split("(")[0].split("{")[0]
            symbols.append(
                SymbolDefinition(
                    name=name,
                    qualified_name=name,
                    kind=SymbolKind.CLASS,
                    file_path=file_path,
                    line_number=idx,
                    end_line=idx,
                    signature=line_clean,
                )
            )
        elif line_clean.startswith("function ") or line_clean.startswith("export function ") or line_clean.startswith("def "):
            parts = line_clean.split()
            name = parts[1].split("(")[0]
            symbols.append(
                SymbolDefinition(
                    name=name,
                    qualified_name=name,
                    kind=SymbolKind.FUNCTION,
                    file_path=file_path,
                    line_number=idx,
                    end_line=idx,
                    signature=line_clean,
                )
            )

    return symbols, []


def build_symbol_call_graph(
    symbols: Sequence[SymbolDefinition],
    call_sites: Sequence[SymbolCallSite],
) -> dict[str, list[SymbolCallSite]]:
    """
    Build directed adjacency graph of symbol invocations.
    """
    symbol_map = {s.qualified_name: s for s in symbols}
    symbol_names = {s.name: s for s in symbols}

    adj: dict[str, list[SymbolCallSite]] = defaultdict(list)

    for call in call_sites:
        caller = call.caller_symbol
        callee = call.callee_symbol

        # Resolve callee target file if known
        target_file = ""
        if callee in symbol_map:
            target_file = symbol_map[callee].file_path
        elif "." in callee:
            method_name = callee.split(".")[-1]
            if method_name in symbol_names:
                target_file = symbol_names[method_name].file_path
        elif callee in symbol_names:
            target_file = symbol_names[callee].file_path

        resolved_call = SymbolCallSite(
            caller_symbol=caller,
            callee_symbol=callee,
            caller_file=call.caller_file,
            callee_file=target_file or call.callee_file,
            line_number=call.line_number,
            call_type=call.call_type,
        )
        adj[caller].append(resolved_call)

    return dict(adj)


def trace_symbol_hierarchy(
    target_symbol: str,
    symbols: Sequence[SymbolDefinition],
    call_sites: Sequence[SymbolCallSite],
) -> SymbolHierarchyResult | None:
    """
    Trace all callers and callees for a specific class or method.
    """
    target_def = None
    target_lower = target_symbol.lower()

    for s in symbols:
        if s.qualified_name.lower() == target_lower or s.name.lower() == target_lower:
            target_def = s
            break

    if not target_def:
        return None

    incoming: list[SymbolCallSite] = []
    outgoing: list[SymbolCallSite] = []

    target_qname = target_def.qualified_name
    target_name = target_def.name

    for c in call_sites:
        if c.caller_symbol == target_qname:
            outgoing.append(c)
        if c.callee_symbol == target_qname or c.callee_symbol == target_name or c.callee_symbol.endswith(f".{target_name}"):
            incoming.append(c)

    subclasses = [s.qualified_name for s in symbols if target_name in s.base_classes]

    return SymbolHierarchyResult(
        symbol=target_def,
        incoming_callers=incoming,
        outgoing_callees=outgoing,
        subclasses=subclasses,
        superclasses=target_def.base_classes,
    )
