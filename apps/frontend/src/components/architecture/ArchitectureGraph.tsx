import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from "lucide-react";
import type {
  ArchitectureGraph as ArchitectureGraphData,
  ArchitectureNodeType,
} from "@/types/architecture";

// npm install cytoscape @types/cytoscape

const TYPE_COLOR: Record<ArchitectureNodeType, string> = {
  service: "#5E6AD2",
  module: "#696E77",
  package: "#696E77",
  database: "#2F9E52",
  external: "#9A9DA6",
  queue: "#C98A1B",
};

const TYPE_SHAPE: Record<ArchitectureNodeType, cytoscape.Css.NodeShape> = {
  service: "round-rectangle",
  module: "rectangle",
  package: "rectangle",
  database: "barrel",
  external: "ellipse",
  queue: "diamond",
};

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
  const [typeFilter, setTypeFilter] = useState<"all" | ArchitectureNodeType>("all");

  // Build the graph once per new dataset
  useEffect(() => {
    if (!containerRef.current) return;

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: { id: n.id, label: n.name, type: n.type },
      })),
      ...graph.edges.map((e) => ({
        data: { id: e.id, source: e.source, target: e.target },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#fff",
            "border-width": 2,
            "border-color": (ele) =>
              TYPE_COLOR[ele.data("type") as ArchitectureNodeType] ?? "#696E77",
            shape: (ele) =>
              TYPE_SHAPE[ele.data("type") as ArchitectureNodeType] ?? "rectangle",
            label: "data(label)",
            "font-size": 10,
            "text-valign": "center",
            "text-halign": "center",
            width: 100,
            height: 34,
            color: "#1A1B23",
          },
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "line-color": "#D7D7DC",
            "target-arrow-color": "#D7D7DC",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
          },
        },
        { selector: ".faded", style: { opacity: 0.15 } },
        { selector: ".selected", style: { "border-width": 3, "border-color": "#5E6AD2" } },
        {
          selector: ".dep-highlight",
          style: { "line-color": "#5E6AD2", "target-arrow-color": "#5E6AD2", width: 2.5 },
        },
        {
          selector: ".dependent-highlight",
          style: { "line-color": "#2F9E52", "target-arrow-color": "#2F9E52", width: 2.5 },
        },
        { selector: ".hidden-el", style: { display: "none" } },
      ],
      layout: { name: "breadthfirst", directed: true, spacingFactor: 1.2, padding: 24 },
    });

    cy.on("tap", "node", (evt) => onSelectNode(evt.target.id()));
    cy.on("tap", (evt) => {
      if (evt.target === cy) onSelectNode(null);
    });

    cyRef.current = cy;

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);

  // Selection highlighting — contract §8: highlight selected node, its
  // outgoing dependencies, incoming dependents, and de-emphasize the rest.
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("faded selected dep-highlight dependent-highlight");
    if (!selectedNodeId) return;

    cy.elements().addClass("faded");
    const node = cy.$id(selectedNodeId);
    node.removeClass("faded").addClass("selected");

    node.outgoers("edge").forEach((edge) => {
      edge.removeClass("faded").addClass("dep-highlight");
      edge.target().removeClass("faded");
    });
    node.incomers("edge").forEach((edge) => {
      edge.removeClass("faded").addClass("dependent-highlight");
      edge.source().removeClass("faded");
    });
  }, [selectedNodeId]);

  // Type filter
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("hidden-el");
    cy.edges().removeClass("hidden-el");
    if (typeFilter === "all") return;
    cy.nodes().forEach((n) => {
      if (n.data("type") !== typeFilter) n.addClass("hidden-el");
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
  const fit = () => cyRef.current?.fit(undefined, 30);
  const reset = () => {
    onSelectNode(null);
    setTypeFilter("all");
    cyRef.current
      ?.layout({ name: "breadthfirst", directed: true, spacingFactor: 1.2, padding: 24 })
      .run();
    setTimeout(() => cyRef.current?.fit(undefined, 30), 260);
  };

  // Contract §18: empty state — completed status but zero nodes. No fake nodes.
  if (graph.nodes.length === 0) {
    return (
      <div className="flex h-[460px] items-center justify-center rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 text-center text-[12.5px] text-[var(--cd-ink-faint)]">
        No architectural components were detected.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cd-border-soft)] px-3.5 py-2.5">
        <div className="flex items-center overflow-hidden rounded-lg border border-[var(--cd-border)]">
          <button
            onClick={zoomIn}
            title="Zoom in"
            className="cursor-pointer px-2.5 py-1.5 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={zoomOut}
            title="Zoom out"
            className="cursor-pointer border-l border-[var(--cd-border)] px-2.5 py-1.5 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fit}
            title="Fit to view"
            className="cursor-pointer border-l border-[var(--cd-border)] px-2.5 py-1.5 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={reset}
            title="Reset"
            className="cursor-pointer border-l border-[var(--cd-border)] px-2.5 py-1.5 text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | ArchitectureNodeType)}
          className="rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--cd-ink-soft)]"
        >
          <option value="all">Filter: All</option>
          <option value="service">Services</option>
          <option value="module">Modules</option>
          <option value="package">Packages</option>
          <option value="database">Databases</option>
          <option value="external">External</option>
          <option value="queue">Queues</option>
        </select>
      </div>
      <div
        ref={containerRef}
        className="h-[460px] w-full"
        style={{
          background:
            "linear-gradient(var(--cd-border-soft) 1px, transparent 1px), linear-gradient(90deg, var(--cd-border-soft) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}