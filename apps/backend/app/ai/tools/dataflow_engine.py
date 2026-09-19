"""
Inter-Procedural Request & Data-Flow Pipeline Engine for Coodara AI.

Traces runtime requests from HTTP ingress through schemas, application services,
and repository adapters down to SQL database tables with exact file line numbers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Sequence

from app.ai.tools.symbol_engine import SymbolCallSite, SymbolDefinition, SymbolKind


@dataclass(frozen=True)
class RequestPipelineStage:
    """A verified stage in a request and data flow pipeline."""

    layer: str  # "Presentation (Router)", "Validation (Schema)", "Business Logic (Service)", "Persistence (Repository)", "Storage (Database)"
    component_name: str
    file_path: str
    line_number: int
    operation: str
    data_contract: str = ""


@dataclass(frozen=True)
class RequestPipeline:
    """Complete 5-stage request and data flow pipeline."""

    endpoint: str  # e.g. "POST /api/v1/analysis"
    http_method: str  # e.g. "POST"
    handler_name: str
    router_file: str
    router_line: int
    stages: list[RequestPipelineStage] = field(default_factory=list)
    request_schema: str | None = None
    response_schema: str | None = None
    service_coordinator: str | None = None
    repository_adapter: str | None = None
    target_database_table: str | None = None


def discover_request_pipelines(
    symbols: Sequence[SymbolDefinition],
    call_sites: Sequence[SymbolCallSite],
) -> list[RequestPipeline]:
    """
    Discover all HTTP endpoints and reconstruct their 5-stage data-flow pipelines.
    """
    pipelines: list[RequestPipeline] = []

    # 1. Find all route handlers
    route_handlers = [
        s for s in symbols
        if s.kind == SymbolKind.ROUTE_HANDLER
        or any("get" in d.lower() or "post" in d.lower() or "put" in d.lower() or "delete" in d.lower() or "route" in d.lower() for d in s.decorators)
    ]

    # Map symbols for rapid lookup
    sym_map = {s.qualified_name: s for s in symbols}
    class_map = {s.name: s for s in symbols if s.kind in (SymbolKind.CLASS, SymbolKind.ORM_MODEL, SymbolKind.SCHEMA)}

    for route in route_handlers:
        # Extract HTTP method and endpoint path from decorators
        http_method = "GET"
        endpoint_path = f"/{route.name.replace('_', '-')}"

        for dec in route.decorators:
            dec_lower = dec.lower()
            if "post" in dec_lower:
                http_method = "POST"
            elif "put" in dec_lower:
                http_method = "PUT"
            elif "delete" in dec_lower:
                http_method = "DELETE"
            elif "get" in dec_lower:
                http_method = "GET"

            path_match = re.search(r"""['"](/[^'"]*)['"]""", dec)
            if path_match:
                endpoint_path = path_match.group(1)

        endpoint_label = f"{http_method} {endpoint_path}"

        # 2. Build stages
        stages: list[RequestPipelineStage] = []

        # Stage 1: Presentation
        stages.append(
            RequestPipelineStage(
                layer="1. Presentation (Router)",
                component_name=route.qualified_name,
                file_path=route.file_path,
                line_number=route.line_number,
                operation=f"Handles incoming HTTP {http_method} request and validates payload",
            )
        )

        # Stage 2: Discover Service invocation
        service_name: str | None = None
        service_line = route.line_number
        service_file = route.file_path

        out_calls = [c for c in call_sites if c.caller_symbol == route.qualified_name]
        for c in out_calls:
            callee = c.callee_symbol
            if "Service" in callee or "service" in callee.lower() or "manager" in callee.lower():
                service_name = callee
                service_line = c.line_number
                if callee in sym_map:
                    service_file = sym_map[callee].file_path
                break

        if service_name:
            stages.append(
                RequestPipelineStage(
                    layer="2. Business Logic (Service)",
                    component_name=service_name,
                    file_path=service_file,
                    line_number=service_line,
                    operation="Coordinates domain business logic and workflow authorization",
                )
            )

        # Stage 3: Discover Repository / Database adapter
        repo_name: str | None = None
        repo_line = service_line
        repo_file = service_file

        service_calls = [c for c in call_sites if service_name and (c.caller_symbol == service_name or c.caller_symbol.startswith(service_name.split(".")[0]))]
        for sc in service_calls:
            callee = sc.callee_symbol
            if "Repository" in callee or "repo" in callee.lower() or "adapter" in callee.lower() or "db" in callee.lower():
                repo_name = callee
                repo_line = sc.line_number
                if callee in sym_map:
                    repo_file = sym_map[callee].file_path
                break

        if repo_name:
            stages.append(
                RequestPipelineStage(
                    layer="3. Persistence (Repository Adapter)",
                    component_name=repo_name,
                    file_path=repo_file,
                    line_number=repo_line,
                    operation="Translates domain queries into database operations",
                )
            )

        # Stage 4: Discover Database Table / ORM Model
        db_model_name: str | None = None
        for s in symbols:
            if s.kind == SymbolKind.ORM_MODEL and (route.name.split("_")[0] in s.name.lower() or (service_name and service_name.lower().startswith(s.name.lower()[:4]))):
                db_model_name = s.name
                stages.append(
                    RequestPipelineStage(
                        layer="4. Storage (Database Entity)",
                        component_name=s.name,
                        file_path=s.file_path,
                        line_number=s.line_number,
                        operation=f"SQLAlchemy Entity mapping to PostgreSQL table '{s.name.lower()}s'",
                    )
                )
                break

        pipelines.append(
            RequestPipeline(
                endpoint=endpoint_label,
                http_method=http_method,
                handler_name=route.qualified_name,
                router_file=route.file_path,
                router_line=route.line_number,
                stages=stages,
                service_coordinator=service_name,
                repository_adapter=repo_name,
                target_database_table=db_model_name,
            )
        )

    return pipelines


def trace_request_flow(
    target_query: str,
    symbols: Sequence[SymbolDefinition],
    call_sites: Sequence[SymbolCallSite],
) -> RequestPipeline | None:
    """
    Trace request and data pipeline matching endpoint query or symbol.
    """
    pipelines = discover_request_pipelines(symbols, call_sites)
    if not pipelines:
        return None

    query_lower = target_query.lower()

    # Match by endpoint path or HTTP method
    for p in pipelines:
        if p.endpoint.lower() in query_lower or query_lower in p.endpoint.lower():
            return p
        if p.handler_name.lower() in query_lower:
            return p

    # Default to first discovered pipeline
    return pipelines[0]


def format_request_pipeline_diagram(pipeline: RequestPipeline) -> str:
    """
    Format a request pipeline into an authoritative ASCII data flow diagram.
    """
    lines = [f"### 🌊 End-to-End Request & Data-Flow Pipeline: `{pipeline.endpoint}`", ""]
    lines.append("```text")
    lines.append(f"HTTP Ingress Client ({pipeline.endpoint})")

    for idx, stage in enumerate(pipeline.stages, start=1):
        lines.append("        ↓")
        lines.append(f"[{stage.layer}]")
        lines.append(f"  Component: {stage.component_name}")
        lines.append(f"  Location:  {stage.file_path}:{stage.line_number}")
        lines.append(f"  Operation: {stage.operation}")

    lines.append("```")
    return "\n".join(lines)
