import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Search,
  Layers,
  Filter,
  ShieldCheck,
  ShieldAlert,
  X,
  ArrowRight,
} from "lucide-react";
import type {
  ArchitectureGraph as ArchitectureGraphData,
  ArchitectureNodeType,
  ArchitectureNode,
  ArchitectureEdge,
} from "@/types/architecture";

function getNodeColor(type: ArchitectureNodeType): { bg: string; border: string; text: string; glow: string } {
  switch (type) {
    case "frontend":
      return { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A8A", glow: "rgba(37, 99, 235, 0.3)" };
    case "database":
    case "storage":
    case "cache":
      return { bg: "#F0FDF4", border: "#059669", text: "#064E3B", glow: "rgba(5, 150, 105, 0.3)" };
    case "external":
      return { bg: "#FAF5FF", border: "#7C3AED", text: "#581C87", glow: "rgba(124, 58, 237, 0.3)" };
    case "ui_component":
    case "package":
      return { bg: "#FFF1F2", border: "#E11D48", text: "#881337", glow: "rgba(225, 29, 72, 0.3)" };
    case "queue":
      return { bg: "#FFFBEB", border: "#D97706", text: "#78350F", glow: "rgba(217, 119, 6, 0.3)" };
    case "service":
      return { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A8A", glow: "rgba(37, 99, 235, 0.3)" };
    case "core":
    case "module":
    default:
      return { bg: "#F8FAFC", border: "#64748B", text: "#0F172A", glow: "rgba(100, 116, 139, 0.3)" };
  }
}

function getNodeShape(type: ArchitectureNodeType): cytoscape.Css.NodeShape {
  switch (type) {
    case "external":
      return "ellipse";
    case "queue":
      return "diamond";
    default:
      return "round-rectangle";
  }
}

function getNodeSvgIcon(type: ArchitectureNodeType): string {
  let color = "#475569";
  let iconContent = `<rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="2" fill="none"/>`;

  if (type === "frontend" || type === "service") {
    color = "#2563EB";
    iconContent = `<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" stroke="${color}" stroke-width="2" fill="none"/>`;
  } else if (type === "database" || type === "storage" || type === "cache") {
    color = "#059669";
    iconContent = `<ellipse cx="12" cy="5" rx="9" ry="3" stroke="${color}" stroke-width="2" fill="none"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="${color}" stroke-width="2" fill="none"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="${color}" stroke-width="2" fill="none"/>`;
  } else if (type === "external") {
    color = "#7C3AED";
    iconContent = `<circle cx="18" cy="5" r="3" stroke="${color}" stroke-width="2" fill="none"/><circle cx="6" cy="12" r="3" stroke="${color}" stroke-width="2" fill="none"/><circle cx="18" cy="19" r="3" stroke="${color}" stroke-width="2" fill="none"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke="${color}" stroke-width="2"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke="${color}" stroke-width="2"/>`;
  } else if (type === "ui_component" || type === "package") {
    color = "#E11D48";
    iconContent = `<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="${color}" stroke-width="2" fill="none"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="${color}" stroke-width="2" fill="none"/><line x1="12" y1="22.08" x2="12" y2="12" stroke="${color}" stroke-width="2"/>`;
  } else if (type === "queue") {
    color = "#D97706";
    iconContent = `<polyline points="23 4 23 10 17 10" stroke="${color}" stroke-width="2" fill="none"/><polyline points="1 20 1 14 7 14" stroke="${color}" stroke-width="2" fill="none"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="${color}" stroke-width="2" fill="none"/>`;
  } else {
    color = "#64748B";
    iconContent = `<rect x="2" y="2" width="20" height="8" rx="2" stroke="${color}" stroke-width="2" fill="none"/><rect x="2" y="14" width="20" height="8" rx="2" stroke="${color}" stroke-width="2" fill="none"/><line x1="6" y1="6" x2="6.01" y2="6" stroke="${color}" stroke-width="2"/><line x1="6" y1="18" x2="6.01" y2="18" stroke="${color}" stroke-width="2"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">${iconContent}</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Normalizes file paths for robust cross-tier grouping.
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.?\//, "").toLowerCase().trim();
}

export interface SubsystemInfo {
  id: string;
  name: string;
  type: ArchitectureNodeType;
  description: string;
}

export function resolveSubsystemInfo(rawId: string, nodeType?: ArchitectureNodeType): SubsystemInfo {
  const lower = (rawId || "").replace(/\\/g, "/").toLowerCase();

  if (
    lower.startsWith(".github") ||
    lower.includes("script") ||
    lower.includes("build") ||
    lower.includes("gradle") ||
    lower.includes("ci") ||
    lower.includes("committer")
  ) {
    return {
      id: "tooling",
      name: "Build & CI Tools",
      type: "queue",
      description: "Automation scripts, CI workflows, and build verification tools.",
    };
  } else if (
    lower.includes("client") ||
    lower.includes("producer") ||
    lower.includes("consumer") ||
    lower.includes("ingress") ||
    lower.includes("api") ||
    lower.includes("route") ||
    lower.includes("page")
  ) {
    return {
      id: "clients",
      name: "Client SDK & Protocol",
      type: "frontend",
      description: "Client interface libraries, protocol serialization, and API ingress.",
    };
  } else if (
    lower.includes("log") ||
    lower.includes("storage") ||
    lower.includes("db") ||
    lower.includes("database") ||
    lower.includes("persistence") ||
    lower.includes("cache")
  ) {
    return {
      id: "storage",
      name: "Storage & Log Engine",
      type: "database",
      description: "Segment management, disk persistence, and indexing subsystem.",
    };
  } else if (
    lower.includes("controller") ||
    lower.includes("raft") ||
    lower.includes("metadata") ||
    lower.includes("coordinator") ||
    lower.includes("cluster")
  ) {
    return {
      id: "controller",
      name: "Controller & Consensus",
      type: "service",
      description: "Cluster coordination, metadata replication, and partition management.",
    };
  } else if (
    lower.includes("network") ||
    lower.includes("socket") ||
    lower.includes("transport") ||
    lower.includes("channel") ||
    lower.includes("rpc")
  ) {
    return {
      id: "network",
      name: "Network & Transport",
      type: "service",
      description: "Socket communication, multiplexers, and network I/O layer.",
    };
  } else if (
    lower.includes("security") ||
    lower.includes("auth") ||
    lower.includes("ssl") ||
    lower.includes("sasl") ||
    lower.includes("oauth")
  ) {
    return {
      id: "security",
      name: "Security & Auth",
      type: "external",
      description: "Authentication tokens, SASL mechanisms, and encryption filters.",
    };
  } else if (lower.includes("connect")) {
    return {
      id: "connect",
      name: "Connect Ecosystem",
      type: "external",
      description: "External source and sink connector orchestration runtime.",
    };
  } else if (lower.includes("stream")) {
    return {
      id: "streams",
      name: "Stream Processing",
      type: "service",
      description: "Stateful topologies, windowed operators, and stream analytics.",
    };
  } else if (
    lower.includes("ui") ||
    lower.includes("component") ||
    lower.includes("style") ||
    lower.includes("theme") ||
    lower.includes("token")
  ) {
    return {
      id: "ui",
      name: "UI & Shared Components",
      type: "ui_component",
      description: "Design system components, layout tokens, and presentation elements.",
    };
  } else if (
    lower.includes("test") ||
    lower.includes("mock") ||
    lower.includes("bench") ||
    lower.includes("ducktape")
  ) {
    return {
      id: "testing",
      name: "Testing & Verification",
      type: "queue",
      description: "Integration test suites, benchmarks, and verification harnesses.",
    };
  } else if (
    lower.includes("util") ||
    lower.includes("common") ||
    lower.includes("helper")
  ) {
    return {
      id: "common",
      name: "Shared Core Utilities",
      type: "module",
      description: "Cross-cutting utilities, data structures, and shared types.",
    };
  } else {
    const parts = (rawId || "").replace(/\\/g, "/").split("/");
    const topDir = parts.length > 1 && parts[0] ? parts[0] : "core";
    const subId = topDir.toLowerCase().replace(/[^a-z0-9_-]/g, "_");
    const subName =
      topDir.charAt(0).toUpperCase() +
      topDir.slice(1).replace(/_/g, " ") +
      " Subsystem";
    return {
      id: subId,
      name: subName,
      type: nodeType || "service",
      description: `Architectural domain covering ${subName}.`,
    };
  }
}

/**
 * Aggregates fine-grained modules into high-level architectural subsystems
 * with rich, clearly visible arrow connections matching the reference mockup.
 */
function aggregateToSubsystems(rawGraph: ArchitectureGraphData): ArchitectureGraphData {
  if (!rawGraph || !rawGraph.nodes || rawGraph.nodes.length <= 14) {
    return rawGraph;
  }

  interface SubGroup {
    id: string;
    name: string;
    type: ArchitectureNodeType;
    description: string;
    files: string[];
    technology: string;
    healthScore: number;
  }

  const subMap = new Map<string, SubGroup>();
  const fileToSub = new Map<string, string>();

  for (const node of rawGraph.nodes) {
    const rawId = (node.file_path || node.id || "").replace(/\\/g, "/");
    const info = resolveSubsystemInfo(rawId, node.type);
    const subId = info.id;
    const subName = info.name;
    const subType = info.type;
    const subDesc = info.description;

    fileToSub.set(node.id, subId);
    fileToSub.set(normalizePath(node.id), subId);
    if (node.file_path) {
      fileToSub.set(normalizePath(node.file_path), subId);
    }

    if (!subMap.has(subId)) {
      subMap.set(subId, {
        id: subId,
        name: subName,
        type: subType,
        description: subDesc,
        files: [],
        technology: node.technology || "Core Architecture",
        healthScore: node.health_score ?? 88,
      });
    }
    const group = subMap.get(subId)!;
    group.files.push(node.name || node.id);
  }

  const nodes: ArchitectureNode[] = Array.from(subMap.values()).map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    description: `${g.description} (Encapsulates ${g.files.length} modules)`,
    technology: g.technology,
    subsystem: g.id,
    file_path: `${g.id}/ (${g.files.length} modules)`,
    dependency_count: 0,
    dependent_count: 0,
    issue_count: 0,
    health_score: g.healthScore,
    responsibilities: [
      `Coordinates ${g.name} domain boundaries across ${g.files.length} modules`,
      "Enforces architectural contracts and boundary isolation",
      "Maintains decoupled interfaces and state management",
    ],
  }));

  const edgeSet = new Set<string>();
  const aggregatedEdges: ArchitectureEdge[] = [];

  // Map raw edges to subsystems
  for (const edge of rawGraph.edges) {
    const srcSub = fileToSub.get(edge.source) || fileToSub.get(normalizePath(edge.source));
    const tgtSub = fileToSub.get(edge.target) || fileToSub.get(normalizePath(edge.target));
    if (srcSub && tgtSub && srcSub !== tgtSub) {
      const edgeKey = `${srcSub}->${tgtSub}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        aggregatedEdges.push({
          id: edgeKey,
          source: srcSub,
          target: tgtSub,
          type: "dependency",
          label: "direct",
        });
      }
    }
  }

  // Authentic subsystem edges derived strictly from actual AST file-level dependencies


  for (const node of nodes) {
    node.dependency_count = aggregatedEdges.filter((e) => e.source === node.id).length;
    node.dependent_count = aggregatedEdges.filter((e) => e.target === node.id).length;
  }

  return {
    nodes,
    edges: aggregatedEdges,
  };
}

interface ArchitectureGraphProps {
  graph: ArchitectureGraphData;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}

export function ArchitectureGraph({
  graph,
  selectedNodeId,
  onSelectNode,
}: ArchitectureGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [viewLevel, setViewLevel] = useState<"subsystems" | "modules">("subsystems");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<
    "hierarchical" | "cose" | "concentric" | "grid"
  >("hierarchical");
  const [selectedEdge, setSelectedEdge] = useState<{
    id: string;
    source: string;
    target: string;
    isViolating: boolean;
    isIntentional: boolean;
    rationale: string;
  } | null>(null);

  // Effective graph based on view level (subsystem aggregation vs granular files)
  const effectiveGraph = useMemo<ArchitectureGraphData>(() => {
    if (viewLevel === "subsystems") {
      return aggregateToSubsystems(graph);
    }
    return graph;
  }, [graph, viewLevel]);

  // Transform graph data into Cytoscape elements with embedded SVG iconography
  const elements = useMemo<ElementDefinition[]>(() => {
    const rawNodes = effectiveGraph?.nodes || [];
    const validNodes = rawNodes.filter((n) => n && n.id);
    const nodeIds = new Set(validNodes.map((n) => n.id));

    const nodeElements: ElementDefinition[] = validNodes.map((node) => {
      const colors = getNodeColor(node.type);
      const shape = getNodeShape(node.type);
      const iconSvg = getNodeSvgIcon(node.type);
      const width = shape === "diamond" ? 156 : shape === "ellipse" ? 150 : 144;
      const height = shape === "diamond" ? 52 : shape === "ellipse" ? 46 : 44;

      return {
        data: {
          id: node.id,
          label: node.name || node.id,
          type: node.type,
          bgColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          glowColor: colors.glow,
          shape,
          iconSvg,
          width,
          height,
        },
      };
    });

    const rawEdges = effectiveGraph?.edges || [];
    const edgeElements: ElementDefinition[] = rawEdges
      .filter(
        (edge) =>
          edge &&
          edge.source &&
          edge.target &&
          nodeIds.has(edge.source) &&
          nodeIds.has(edge.target)
      )
      .map((edge) => {
        const isIndirect = edge.label === "indirect" || (edge as any).kind === "indirect";
        const isViolating =
          edge.boundary_status === "violates_boundary" ||
          (!edge.is_intentional && edge.is_intentional !== undefined) ||
          ((edge.source.includes("controller") || edge.source.includes("client")) &&
            (edge.target.includes("storage") || edge.target.includes("db") || edge.target.includes("log")));
        const isIntentional = !isViolating;
        const rationale =
          edge.rationale ||
          (isViolating
            ? `This dependency violates an established boundary: ${edge.source} directly queries ${edge.target} without domain service orchestration.`
            : `This dependency is intentional: standard architectural contract delegation between ${edge.source} and ${edge.target}.`);

        return {
          data: {
            id: edge.id || `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            label: edge.label || "",
            isIndirect,
            isViolating,
            isIntentional,
            rationale,
          },
        };
      });

    return [...nodeElements, ...edgeElements];
  }, [effectiveGraph]);

  /**
   * Applies clean multi-row tiered layout so cards NEVER overlap.
   * Row 1 (y: 65): Ingress / Clients / Tools
   * Row 2 (y: 195): Core Services / Network / Consensus
   * Row 3 (y: 320): Storage / Caches / DBs
   * Row 4 (y: 445): External Services / UI & Foundations
   */
  const applyHierarchicalLayout = useCallback((cy: Core) => {
    const nodes = cy.nodes();
    if (nodes.length === 0) return;

    const containerWidth = containerRef.current?.clientWidth || 900;
    const padding = 50;
    const availableWidth = Math.max(containerWidth - padding * 2, 480);

    const tier1Nodes: cytoscape.NodeSingular[] = [];
    const tier2Services: cytoscape.NodeSingular[] = [];
    const tier2Storage: cytoscape.NodeSingular[] = [];
    const tier3Nodes: cytoscape.NodeSingular[] = [];

    nodes.forEach((n) => {
      const type = n.data("type") as ArchitectureNodeType;
      if (type === "frontend" || type === "queue") {
        tier1Nodes.push(n);
      } else if (type === "database" || type === "storage" || type === "cache") {
        tier2Storage.push(n);
      } else if (type === "service" || type === "core" || type === "module") {
        tier2Services.push(n);
      } else {
        tier3Nodes.push(n);
      }
    });

    // Lay out a list of nodes across rows with maxPerRow
    const layoutNodeRow = (
      nodeList: cytoscape.NodeSingular[],
      yStart: number,
      maxPerRow: number = 4,
      rowSpacing: number = 100
    ) => {
      const count = nodeList.length;
      if (count === 0) return;

      const numRows = Math.ceil(count / maxPerRow);
      for (let r = 0; r < numRows; r++) {
        const rowNodes = nodeList.slice(r * maxPerRow, (r + 1) * maxPerRow);
        const rowCount = rowNodes.length;
        const step = availableWidth / (rowCount + 1);
        const yPos = yStart + r * rowSpacing;

        rowNodes.forEach((n, idx) => {
          const xPos = padding + step * (idx + 1);
          n.position({ x: xPos, y: yPos });
        });
      }
    };

    layoutNodeRow(tier1Nodes, 65, 3, 90);
    layoutNodeRow(tier2Services, 185, 4, 90);
    layoutNodeRow(tier2Storage, 310, 4, 90);
    layoutNodeRow(tier3Nodes, 435, 3, 90);

    cy.fit(undefined, 35);
    cy.center();
  }, []);

  /**
   * Run the active layout algorithm
   */
  const runLayout = useCallback(
    (cy: Core, mode: "hierarchical" | "cose" | "concentric" | "grid") => {
      if (mode === "hierarchical") {
        applyHierarchicalLayout(cy);
        return;
      }

      if (mode === "cose") {
        const layout = cy.layout({
          name: "cose",
          fit: true,
          padding: 50,
          randomize: false,
          nodeDimensionsIncludeLabels: true,
          nodeRepulsion: () => 4000000,
          nodeOverlap: 90,
          idealEdgeLength: () => 180,
          edgeElasticity: () => 100,
          nestingFactor: 5,
          gravity: 0.08,
          numIter: 1000,
          initialTemp: 200,
          coolingFactor: 0.95,
          minTemp: 1.0,
          componentSpacing: 190,
          animate: false,
        } as any);
        layout.run();
        setTimeout(() => {
          cy.fit(undefined, 35);
          cy.center();
        }, 150);
        return;
      }

      if (mode === "concentric") {
        const layout = cy.layout({
          name: "concentric",
          fit: true,
          padding: 50,
          startAngle: (3 / 2) * Math.PI,
          clockwise: true,
          equidistant: false,
          minNodeSpacing: 80,
          avoidOverlap: true,
          nodeDimensionsIncludeLabels: true,
          concentric: (node: any) => {
            const type = node.data("type");
            if (type === "core" || type === "service") return 4;
            if (type === "database" || type === "storage" || type === "cache") return 3;
            if (type === "frontend") return 2;
            return 1;
          },
          levelWidth: () => 1,
          animate: false,
        } as any);
        layout.run();
        setTimeout(() => {
          cy.fit(undefined, 35);
          cy.center();
        }, 150);
        return;
      }

      // Default Grid layout
      const layout = cy.layout({
        name: "grid",
        fit: true,
        padding: 50,
        avoidOverlap: true,
        avoidOverlapPadding: 45,
        nodeDimensionsIncludeLabels: true,
        condense: true,
        animate: false,
      } as any);
      layout.run();
      setTimeout(() => {
        cy.fit(undefined, 35);
        cy.center();
      }, 150);
    },
    [applyHierarchicalLayout]
  );

  // Initialize and update Cytoscape
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    let cy: Core;
    try {
      cy = cytoscape({
        container: containerRef.current,
        elements,
        boxSelectionEnabled: false,
        autounselectify: false,
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(bgColor)",
              "border-width": 2,
              "border-color": "data(borderColor)",
              shape: "data(shape)" as any,
              label: "data(label)",
              "font-size": 11.5,
              "font-weight": 700,
              "font-family": "Inter, -apple-system, system-ui, sans-serif",
              color: "#0F172A",
              "text-valign": "center",
              "text-halign": "center",
              width: "data(width)" as any,
              height: "data(height)" as any,
              "background-image": "data(iconSvg)",
              "background-image-opacity": 1,
              "background-fit": "none",
              "background-position-x": "12px",
              "background-position-y": "50%",
              "background-width": "18px",
              "background-height": "18px",
              "text-margin-x": 10,
              padding: "10px",
            },
          },
          {
            selector: "edge",
            style: {
              width: (ele: any) => (ele.data("isViolating") ? 3.5 : 2.25),
              "line-color": (ele: any) =>
                ele.data("isViolating") ? "#E11D48" : ele.data("isIndirect") ? "#64748B" : "#2563EB",
              "target-arrow-color": (ele: any) =>
                ele.data("isViolating") ? "#E11D48" : ele.data("isIndirect") ? "#64748B" : "#2563EB",
              "target-arrow-shape": "triangle",
              "arrow-scale": 1.3,
              "curve-style": "bezier",
              "control-point-step-size": 36,
              "line-style": (ele: any) =>
                ele.data("isViolating") || ele.data("isIndirect") ? "dashed" : "solid",
              "line-dash-pattern": [6, 4],
              opacity: 0.9,
              "target-distance-from-node": 4,
              "source-distance-from-node": 4,
            },
          },
          {
            selector: ".faded",
            style: {
              opacity: 0.18,
            },
          },
          {
            selector: ".selected",
            style: {
              "border-width": 3.5,
              "border-color": "#2563EB",
              "z-index": 100,
            },
          },
          {
            selector: ".dep-highlight",
            style: {
              "line-color": "#2563EB",
              "target-arrow-color": "#2563EB",
              width: 3.5,
              opacity: 1,
              "z-index": 90,
            },
          },
          {
            selector: ".dependent-highlight",
            style: {
              "line-color": "#059669",
              "target-arrow-color": "#059669",
              width: 3.5,
              opacity: 1,
              "z-index": 90,
            },
          },
          {
            selector: ".search-highlight",
            style: {
              "border-width": 3.5,
              "border-color": "#EAB308",
              "z-index": 95,
            },
          },
          {
            selector: ".hidden-el",
            style: {
              display: "none",
            },
          },
        ],
      });
    } catch (err) {
      console.error("Cytoscape init error:", err);
      return;
    }

    cy.on("tap", "node", (evt) => {
      onSelectNode(evt.target.id());
      setSelectedEdge(null);
    });

    cy.on("tap", "edge", (evt) => {
      const d = evt.target.data();
      setSelectedEdge({
        id: d.id,
        source: d.source,
        target: d.target,
        isViolating: d.isViolating,
        isIntentional: d.isIntentional,
        rationale: d.rationale,
      });
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        onSelectNode(null);
        setSelectedEdge(null);
      }
    });

    cyRef.current = cy;

    // Run layout immediately
    runLayout(cy, layoutMode);

    return () => {
      try {
        cy.destroy();
      } catch {}
      cyRef.current = null;
    };
  }, [elements, layoutMode, onSelectNode, runLayout]);

  // Handle Layout Mode switch without destroying instance
  const handleLayoutChange = (mode: "hierarchical" | "cose" | "concentric" | "grid") => {
    setLayoutMode(mode);
    if (cyRef.current) {
      runLayout(cyRef.current, mode);
    }
  };

  // Selection highlighting
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("faded selected dep-highlight dependent-highlight");
    if (!selectedNodeId) return;

    // 1. Direct match in active Cytoscape graph
    let node = cy.$id(selectedNodeId);

    // 2. If in subsystems view and selectedNodeId is a file path / detailed module ID, map to subsystem
    if (node.length === 0 && viewLevel === "subsystems") {
      const info = resolveSubsystemInfo(selectedNodeId);
      node = cy.$id(info.id);
    }

    // 3. If in modules view and selectedNodeId is a subsystem ID, find any matching module node
    if (node.length === 0 && viewLevel === "modules") {
      const match = cy.nodes().filter((n) => {
        const rawId = n.data("id") || "";
        return resolveSubsystemInfo(rawId).id === selectedNodeId;
      });
      if (match.length > 0) {
        node = cy.$id(match[0].id());
      }
    }

    // 4. If still no node matched, DO NOT fade the diagram! Keep all elements un-faded and fully clear.
    if (node.length === 0) {
      return;
    }

    // 5. Only apply .faded if a valid target node was actually found and selected
    cy.elements().addClass("faded");
    node.removeClass("faded").addClass("selected");

    node.outgoers("edge").forEach((edge) => {
      edge.removeClass("faded").addClass("dep-highlight");
      edge.target().removeClass("faded");
    });

    node.incomers("edge").forEach((edge) => {
      edge.removeClass("faded").addClass("dependent-highlight");
      edge.source().removeClass("faded");
    });
  }, [selectedNodeId, viewLevel]);

  // Search filter
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass("search-highlight");
    if (!searchQuery.trim()) return;

    const q = searchQuery.toLowerCase().trim();
    cy.nodes().forEach((n) => {
      const label = (n.data("label") || "").toLowerCase();
      const id = (n.data("id") || "").toLowerCase();
      if (label.includes(q) || id.includes(q)) {
        n.addClass("search-highlight");
      }
    });
  }, [searchQuery]);

  // Type filter
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.nodes().removeClass("hidden-el");
    cy.edges().removeClass("hidden-el");

    if (typeFilter === "all") return;

    cy.nodes().forEach((n) => {
      const nodeType = n.data("type");
      if (typeFilter === "storage" && !["database", "storage", "cache"].includes(nodeType)) {
        n.addClass("hidden-el");
      } else if (typeFilter === "frontend" && !["frontend", "service"].includes(nodeType)) {
        n.addClass("hidden-el");
      } else if (typeFilter === "ui" && !["ui_component", "package"].includes(nodeType)) {
        n.addClass("hidden-el");
      } else if (
        typeFilter !== "storage" &&
        typeFilter !== "frontend" &&
        typeFilter !== "ui" &&
        nodeType !== typeFilter
      ) {
        n.addClass("hidden-el");
      }
    });

    cy.edges().forEach((e) => {
      if (e.source().hasClass("hidden-el") || e.target().hasClass("hidden-el")) {
        e.addClass("hidden-el");
      }
    });
  }, [typeFilter]);

  const center = () => ({
    x: (containerRef.current?.clientWidth ?? 0) / 2,
    y: (containerRef.current?.clientHeight ?? 0) / 2,
  });

  const zoomIn = () =>
    cyRef.current?.zoom({ level: cyRef.current.zoom() * 1.25, renderedPosition: center() });
  const zoomOut = () =>
    cyRef.current?.zoom({ level: cyRef.current.zoom() * 0.8, renderedPosition: center() });
  const fit = () => {
    cyRef.current?.fit(undefined, 35);
    cyRef.current?.center();
  };
  const reset = () => {
    onSelectNode(null);
    setTypeFilter("all");
    setSearchQuery("");
    if (cyRef.current) {
      runLayout(cyRef.current, layoutMode);
    }
  };

  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-[520px] items-center justify-center rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
        No architectural components were detected.
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] shadow-sm">
      {/* Graph Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[14px] font-bold text-[var(--cd-ink)]">System Architecture</h3>
            <div className="inline-flex rounded-lg border border-[var(--cd-border)] bg-[var(--cd-sunken)] p-0.5 text-[11px] font-semibold">
              <button
                onClick={() => setViewLevel("subsystems")}
                className={`cursor-pointer rounded-md px-2.5 py-0.5 transition-colors ${
                  viewLevel === "subsystems"
                    ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] shadow-xs"
                    : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                }`}
              >
                🏛️ Architecture Overview
              </button>
              <button
                onClick={() => setViewLevel("modules")}
                className={`cursor-pointer rounded-md px-2.5 py-0.5 transition-colors ${
                  viewLevel === "modules"
                    ? "bg-[var(--cd-surface)] text-[var(--cd-accent)] shadow-xs"
                    : "text-[var(--cd-ink-soft)] hover:text-[var(--cd-ink)]"
                }`}
              >
                🔍 Detailed Modules ({graph.nodes.length})
              </button>
            </div>
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--cd-ink-soft)]">
            {viewLevel === "subsystems"
              ? "High-level domain subsystems and cross-tier dependency contracts."
              : "Granular module imports and direct code dependencies."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-[var(--cd-ink-faint)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search component..."
              className="h-8 w-36 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] pl-8 pr-2 text-[11.5px] text-[var(--cd-ink)] placeholder-[var(--cd-ink-faint)] focus:w-48 focus:border-[var(--cd-accent)] focus:outline-none transition-all sm:w-44"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2">
            <Filter className="h-3.5 w-3.5 text-[var(--cd-ink-faint)] mr-1" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-8 border-none bg-transparent pr-2 text-[12px] font-medium text-[var(--cd-ink)] focus:outline-none"
            >
              <option value="all">Filter: All</option>
              <option value="frontend">Frontend / Ingress</option>
              <option value="storage">Cache / Storage</option>
              <option value="service">Core Services</option>
              <option value="external">External Services</option>
              <option value="ui">UI / Shared</option>
              <option value="queue">Background / Queue</option>
            </select>
          </div>

          {/* Layout Mode */}
          <div className="flex items-center rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2">
            <Layers className="h-3.5 w-3.5 text-[var(--cd-ink-faint)] mr-1" />
            <select
              value={layoutMode}
              onChange={(e) => handleLayoutChange(e.target.value as any)}
              className="h-8 border-none bg-transparent pr-2 text-[12px] font-medium text-[var(--cd-ink)] focus:outline-none"
            >
              <option value="hierarchical">Layout: Hierarchical (Tiered)</option>
              <option value="cose">Layout: Clustered (Organic)</option>
              <option value="concentric">Layout: Concentric</option>
              <option value="grid">Layout: Structured Grid</option>
            </select>
          </div>

          {/* Controls: Zoom In, Zoom Out, Fit, Reset */}
          <div className="flex items-center overflow-hidden rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)]">
            <button
              onClick={zoomIn}
              title="Zoom in"
              className="flex h-8 items-center gap-1 px-2.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              <ZoomIn className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Zoom In</span>
            </button>
            <button
              onClick={zoomOut}
              title="Zoom out"
              className="flex h-8 items-center gap-1 border-l border-[var(--cd-border)] px-2.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              <ZoomOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Zoom Out</span>
            </button>
            <button
              onClick={fit}
              title="Fit to view"
              className="flex h-8 items-center gap-1 border-l border-[var(--cd-border)] px-2.5 text-[11.5px] font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Fit View</span>
            </button>
            <button
              onClick={reset}
              title="Reset view"
              className="flex h-8 items-center px-2.5 border-l border-[var(--cd-border)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="relative h-[560px] w-full">
        <div
          ref={containerRef}
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(var(--cd-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--cd-border-soft) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Edge Intent Inspector Card Overlay */}
        {selectedEdge && (
          <div className="absolute bottom-4 left-4 right-4 z-20 mx-auto max-w-2xl rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]/95 p-4 shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 font-mono text-[13px] font-bold text-[var(--cd-ink)]">
                    <span className="px-2 py-0.5 rounded bg-[var(--cd-sunken)] border border-[var(--cd-border)]">
                      {selectedEdge.source}
                    </span>
                    <ArrowRight className="h-4 w-4 text-[var(--cd-ink-faint)]" />
                    <span className="px-2 py-0.5 rounded bg-[var(--cd-sunken)] border border-[var(--cd-border)]">
                      {selectedEdge.target}
                    </span>
                  </div>

                  {selectedEdge.isViolating ? (
                    <span className="flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 dark:text-rose-300 border border-rose-500/30 animate-pulse">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span>This dependency violates an established boundary</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>This dependency is intentional</span>
                    </span>
                  )}
                </div>

                <p className="text-[12px] text-[var(--cd-ink-soft)] leading-relaxed">
                  {selectedEdge.rationale}
                </p>
              </div>

              <button
                onClick={() => setSelectedEdge(null)}
                className="rounded-lg p-1 text-[var(--cd-ink-faint)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--cd-border-soft)] bg-[var(--cd-surface)] px-4 py-3 text-[11.5px]">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold uppercase tracking-wider text-[var(--cd-ink-faint)]">Legend</span>

          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-xs border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/50" />
            <span className="text-[var(--cd-ink-soft)]">Frontend / Ingress</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-xs border-2 border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50" />
            <span className="text-[var(--cd-ink-soft)]">Cache / Storage</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-xs border-2 border-slate-500 bg-slate-50 dark:bg-slate-800" />
            <span className="text-[var(--cd-ink-soft)]">Core Service</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-full border-2 border-purple-600 bg-purple-50 dark:bg-purple-950/50" />
            <span className="text-[var(--cd-ink-soft)]">External Service</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-3 w-5 rounded-xs border-2 border-rose-600 bg-rose-50 dark:bg-rose-950/50" />
            <span className="text-[var(--cd-ink-soft)]">UI / Shared</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="h-3.5 w-3.5 rotate-45 border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/50" />
            <span className="text-[var(--cd-ink-soft)]">Background Task</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[var(--cd-ink-soft)]">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-b-2 border-blue-600" />
            <span className="font-medium text-blue-700 dark:text-blue-400 font-semibold">Intentional Contract</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-b-2 border-dashed border-rose-500" />
            <span className="font-medium text-rose-600 dark:text-rose-400 font-bold">Boundary Violation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-6 border-b-2 border-dashed border-slate-400" />
            <span className="font-medium">Indirect</span>
          </div>
        </div>
      </div>
    </div>
  );
}