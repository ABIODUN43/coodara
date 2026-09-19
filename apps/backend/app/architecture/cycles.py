"""
Tarjan's Strongly Connected Components (SCC) Cycle Detector.

Identifies dependency cycles (A -> B -> A, A -> B -> C -> A) deterministically
in directed architecture dependency graphs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True, slots=True)
class DependencyCycle:
    """A detected circular dependency loop."""

    path: tuple[str, ...]
    length: int
    nodes: tuple[str, ...]


class TarjanCycleDetector:
    """
    Finds circular dependency cycles using Tarjan's algorithm with DFS cycle extraction.
    Deterministic and linear time O(V + E) for SCC partitioning.
    """

    def detect_cycles(
        self,
        nodes: Sequence[str],
        edges: Sequence[tuple[str, str]],
        *,
        max_total_cycles: int = 50,
        max_cycles_per_scc: int = 3,
    ) -> tuple[DependencyCycle, ...]:
        """
        Detect all elementary dependency cycles in the directed graph.
        """
        node_set = set(nodes)
        adj: dict[str, list[str]] = {n: [] for n in nodes}
        for src, tgt in edges:
            if src in node_set and tgt in node_set:
                adj[src].append(tgt)

        # Ensure deterministic adjacency ordering
        for src in adj:
            adj[src].sort()

        sccs = self._tarjan_scc(sorted(node_set), adj)
        cycles: list[DependencyCycle] = []
        seen_cycles: set[frozenset[tuple[str, str]]] = set()

        for scc in sccs:
            if len(cycles) >= max_total_cycles:
                break

            scc_set = set(scc)
            if len(scc) == 1:
                # Check for self-loop
                node = scc[0]
                if node in adj[node]:
                    cycle_edges = frozenset({(node, node)})
                    if cycle_edges not in seen_cycles:
                        seen_cycles.add(cycle_edges)
                        cycles.append(
                            DependencyCycle(
                                path=(node, node),
                                length=1,
                                nodes=(node,),
                            )
                        )
                continue

            # Multi-node SCC: extract bounded elementary cycles
            extracted = self._extract_cycles_from_scc(
                scc,
                adj,
                scc_set,
                max_cycles=max_cycles_per_scc,
            )
            for c_path in extracted:
                c_edges = frozenset(
                    (c_path[i], c_path[i + 1])
                    for i in range(len(c_path) - 1)
                )
                if c_edges not in seen_cycles:
                    seen_cycles.add(c_edges)
                    c_nodes = tuple(sorted(set(c_path[:-1])))
                    cycles.append(
                        DependencyCycle(
                            path=tuple(c_path),
                            length=len(c_path) - 1,
                            nodes=c_nodes,
                        )
                    )
                if len(cycles) >= max_total_cycles:
                    break

        # Sort cycles deterministically: smallest length first, then alphabetical path
        return tuple(
            sorted(
                cycles,
                key=lambda c: (c.length, c.path),
            )
        )

    def _tarjan_scc(
        self,
        nodes: list[str],
        adj: dict[str, list[str]],
    ) -> list[list[str]]:
        """
        Tarjan's algorithm for finding strongly connected components.
        """
        index = 0
        indices: dict[str, int] = {}
        lowlinks: dict[str, int] = {}
        on_stack: set[str] = set()
        stack: list[str] = []
        sccs: list[list[str]] = []

        def strongconnect(v: str) -> None:
            nonlocal index
            indices[v] = index
            lowlinks[v] = index
            index += 1
            stack.append(v)
            on_stack.add(v)

            for w in adj.get(v, []):
                if w not in indices:
                    strongconnect(w)
                    lowlinks[v] = min(lowlinks[v], lowlinks[w])
                elif w in on_stack:
                    lowlinks[v] = min(lowlinks[v], indices[w])

            if lowlinks[v] == indices[v]:
                scc: list[str] = []
                while True:
                    w = stack.pop()
                    on_stack.remove(w)
                    scc.append(w)
                    if w == v:
                        break
                sccs.append(sorted(scc))

        for node in nodes:
            if node not in indices:
                strongconnect(node)

        return sccs

    def _extract_cycles_from_scc(
        self,
        scc: list[str],
        adj: dict[str, list[str]],
        scc_set: set[str],
        *,
        max_cycles: int = 3,
    ) -> list[list[str]]:
        """
        Extract elementary cycles within an SCC using bounded DFS.
        """
        cycles: list[list[str]] = []
        visited: list[str] = []
        visited_set: set[str] = set()

        def dfs(curr: str) -> None:
            if len(cycles) >= max_cycles:
                return

            visited.append(curr)
            visited_set.add(curr)

            for neighbor in adj.get(curr, []):
                if neighbor not in scc_set:
                    continue
                if neighbor == visited[0] and len(visited) > 1:
                    cycles.append(list(visited) + [neighbor])
                    # Found an elementary cycle for this path, do not explore deeper
                    break
                elif neighbor not in visited_set and len(visited) < 10:
                    dfs(neighbor)
                    if len(cycles) >= max_cycles:
                        break

            visited.pop()
            visited_set.remove(curr)

        for node in scc:
            if len(cycles) >= max_cycles:
                break
            dfs(node)

        return cycles
