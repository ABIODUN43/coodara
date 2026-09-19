"""
Dense Semantic Embeddings & Vector Similarity Engine for Coodara V2 Architecture Memory.

Generates normalized feature embedding vectors and computes cosine similarity
for hybrid dense-sparse RAG without external API dependencies.
"""

from __future__ import annotations

import hashlib
import math
import re
from dataclasses import dataclass
from typing import Sequence

EMBEDDING_DIM = 64


@dataclass(frozen=True)
class SemanticVector:
    """Normalized dense embedding vector."""

    values: list[float]

    def dot(self, other: SemanticVector) -> float:
        if len(self.values) != len(other.values):
            return 0.0
        return sum(a * b for a, b in zip(self.values, other.values, strict=True))


# Standard architectural semantic feature taxonomy
ARCHITECTURAL_FEATURE_TAXONOMY: list[list[str]] = [
    # 0: Presentation / API
    ["api", "router", "endpoint", "controller", "http", "rest", "graphql", "grpc", "ingress", "gateway"],
    # 1: Validation & Schemas
    ["schema", "pydantic", "dto", "validation", "request", "response", "contract", "payload"],
    # 2: Business Logic & Core Domain
    ["service", "domain", "business", "workflow", "logic", "usecase", "entity", "aggregate", "model"],
    # 3: Persistence & Database
    ["database", "postgres", "sql", "repository", "orm", "sqlalchemy", "migration", "table", "crud", "query"],
    # 4: Asynchronous Processing & Queues
    ["celery", "worker", "task", "job", "queue", "redis", "rabbitmq", "consumer", "publisher", "event", "async"],
    # 5: Security & Authentication
    ["auth", "jwt", "token", "password", "security", "rbac", "permission", "oauth", "bearer", "session"],
    # 6: Caching & Optimization
    ["cache", "redis", "memoize", "ttl", "invalidation", "performance", "latency", "pool"],
    # 7: Observability & Telemetry
    ["telemetry", "metric", "logger", "log", "trace", "span", "prometheus", "healthz", "monitor"],
    # 8: Architectural Patterns
    ["hexagonal", "layered", "microservice", "monolith", "clean", "adp", "dag", "decouple", "dip", "interface"],
    # 9: Constraints & Decisions (ADR)
    ["adr", "decision", "constraint", "rule", "forbidden", "standard", "policy", "convention", "must_not"],
]


def generate_semantic_embedding(text: str, dim: int = EMBEDDING_DIM) -> SemanticVector:
    """
    Generate normalized dense semantic feature embedding vector for text.
    Combines taxonomy projection with character n-gram hashing.
    """
    if not text.strip():
        return SemanticVector(values=[0.0] * dim)

    tokens = [t.lower() for t in re.findall(r"\w+", text)]
    vec = [0.0] * dim

    # 1. Project onto architectural feature taxonomy (first 10 dimensions)
    for tax_idx, keywords in enumerate(ARCHITECTURAL_FEATURE_TAXONOMY):
        match_count = sum(1 for t in tokens if any(kw in t for kw in keywords))
        if match_count > 0:
            vec[tax_idx % dim] += match_count * 2.5

    # 2. Project n-grams & tokens into remaining dimensions via deterministic feature hashing
    for token in tokens:
        # Word hash
        h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
        bucket = (h % (dim - 10)) + 10
        sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
        vec[bucket] += sign * 1.0

        # Subword 3-grams
        for i in range(len(token) - 2):
            trigram = token[i:i + 3]
            th = int(hashlib.sha256(trigram.encode("utf-8")).hexdigest(), 16)
            t_bucket = (th % (dim - 10)) + 10
            vec[t_bucket] += 0.3

    # 3. L2 Normalize vector
    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 1e-9:
        vec = [v / norm for v in vec]
    else:
        vec = [0.0] * dim

    return SemanticVector(values=vec)


def cosine_similarity(v1: SemanticVector, v2: SemanticVector) -> float:
    """
    Calculate mathematical cosine similarity between two normalized vectors.
    Returns float in range [0.0, 1.0].
    """
    dot = v1.dot(v2)
    # Clamp to [0.0, 1.0]
    return max(0.0, min(1.0, dot))
