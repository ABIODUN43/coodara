import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CoodaraMarkdown } from "../CoodaraMarkdown";
import { StructuredReasoningView } from "../StructuredReasoningView";
import { normalizeMarkdownForRendering } from "@/utils/markdownUtils";
import type { StructuredReasoningResult } from "@/api/chat";

describe("Coodara Chat Markdown & Response Rendering", () => {
  // --------------------------------------------------------------------------
  // 1. Normal Markdown
  // --------------------------------------------------------------------------
  it("normalizes escaped markdown and internal metrics while preserving code blocks", () => {
    const raw = `
Check Ca metrics.
\\*\\*Nodes\\*\\*: \\*\\*5\\*\\*
\`\`\`python
code = "**preserved**"
\`\`\`
`;
    const normalized = normalizeMarkdownForRendering(raw);
    expect(normalized).toContain("**Nodes**: **5**");
    expect(normalized).toContain('code = "**preserved**"');
    expect(normalized).toContain("Afferent coupling ($C_a$)");
  });

  it("renders normal Markdown (bold, italic, paragraphs)", () => {
    const markdown = "This is **bold text** and this is *italic text*. Regular paragraph.";
    const { container } = render(<CoodaraMarkdown content={markdown} />);

    const strongEl = container.querySelector("strong");
    expect(strongEl).not.toBeNull();
    expect(strongEl?.textContent).toBe("bold text");

    const emEl = container.querySelector("em");
    expect(emEl).not.toBeNull();
    expect(emEl?.textContent).toBe("italic text");

    // Must NOT display raw asterisks
    expect(container.textContent).not.toContain("**");
  });

  // --------------------------------------------------------------------------
  // 2. Escaped Markdown
  // --------------------------------------------------------------------------
  it("handles accidental escaped Markdown safely without exposing raw backslashes or asterisks", () => {
    const escaped = "- \\*\\*Graph Nodes Evaluated\\*\\*: \\*\\*5\\*\\*\n- \\*\\*Graph Edges Evaluated\\*\\*: \\*\\*21\\*\\*";
    const { container } = render(<CoodaraMarkdown content={escaped} />);

    // Must render bold elements
    const boldElements = container.querySelectorAll("strong");
    expect(boldElements.length).toBeGreaterThanOrEqual(2);

    // Text content should contain clean labels
    expect(container.textContent).toContain("Graph Nodes Evaluated");
    expect(container.textContent).toContain("Graph Edges Evaluated");

    // Must NEVER show raw escaped asterisks or backslashes
    expect(container.textContent).not.toContain("\\*\\*");
    expect(container.textContent).not.toContain("**");
    expect(container.textContent).not.toContain("\\");
  });

  // --------------------------------------------------------------------------
  // 3. Structured Reasoning Native Blocks
  // --------------------------------------------------------------------------
  it("renders structured reasoning into native Coodara components without leaking raw markdown", () => {
    const mockData: StructuredReasoningResult = {
      summary: "Removing `architecture-service` directly breaks 1 caller.",
      target_component: "apps/core/architecture-service",
      candidates: [],
      observed: [
        { statement: "Direct contract dependency on 1 caller (`api-service`)", evidence_ids: ["e1"] },
      ],
      structural_impacts: [
        { statement: "1 direct broken caller", type: "direct", entity_ids: ["apps/api/api-service"] },
        { statement: "1 indirect dependent", type: "indirect", entity_ids: ["apps/web/views"] },
      ],
      inferences: [
        { statement: "Public contract breakage will require caller updates.", language: "likely" },
      ],
      unknowns: [
        { statement: "Missing runtime telemetry: cannot verify dynamic dispatch.", reason: "Static AST only" },
      ],
      confidence: {
        structural: "HIGH",
        evidence: "HIGH",
        runtime: "UNKNOWN",
      },
      evidence: [
        {
          id: "e1",
          repository_path: "apps/api/api-service.py",
          entity_id: "apps/core/architecture-service",
          relationship: "imports",
          why_supports: "Static import verified",
        },
      ],
      alternatives: [
        {
          id: "alt-1",
          name: "Complete Removal",
          intervention: "REMOVE",
          summary: "Directly breaks 1 dependent caller.",
          direct_breakage_count: 1,
          indirect_impact_count: 1,
        },
        {
          id: "alt-2",
          name: "Compatible Refactor",
          intervention: "COMPATIBLE_REFACTOR",
          summary: "Zero direct public-contract breakage under compatible-refactor assumption.",
          direct_breakage_count: 0,
          indirect_impact_count: 1,
        },
      ],
      actions: [
        { type: "view_affected", label: "View affected components", target: "architecture-service" },
        { type: "simulate_removal", label: "Simulate removal", target: "architecture-service" },
      ],
    };

    const handlePrompt = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <StructuredReasoningView
          data={mockData}
          orgId={1}
          repoId={2}
          onActionPrompt={handlePrompt}
        />
      </MemoryRouter>
    );

    // Verify sections rendered as native cards
    expect(screen.getByText(/Executive Summary/i)).toBeDefined();
    expect(screen.getByText(/Verified Repository Reality/i)).toBeDefined();
    expect(screen.getByText(/Structural Impact Analysis/i)).toBeDefined();
    expect(screen.getByText(/Simulated Alternative Interventions/i)).toBeDefined();
    expect(screen.getByText(/Confidence Assessment/i)).toBeDefined();
    expect(screen.getByText(/Traceable Citations/i)).toBeDefined();

    // Verify confidence triad
    expect(screen.getByText("AST Reachability")).toBeDefined();
    expect(screen.getByText("No Live Telemetry")).toBeDefined();

    // Verify alternatives
    expect(screen.getByText(/Zero direct public-contract breakage/i)).toBeDefined();

    // Raw markdown syntax must NOT leak into the UI
    expect(container.textContent).not.toContain("###");
    expect(container.textContent).not.toContain("\\*\\*");
  });

  // --------------------------------------------------------------------------
  // 4. Code Blocks Containing Markdown Characters
  // --------------------------------------------------------------------------
  it("preserves Markdown syntax inside code blocks and source code", () => {
    const rawCode = `Here is Python code:
\`\`\`python
def hello():
    return "**value**"
\`\`\``;

    const { container } = render(<CoodaraMarkdown content={rawCode} />);
    const codeEl = container.querySelector("code");

    expect(codeEl).not.toBeNull();
    // Inside the code block, "**value**" MUST remain untouched!
    expect(codeEl?.textContent).toContain('return "**value**"');
  });

  // --------------------------------------------------------------------------
  // 5. Lists (Unordered and Ordered)
  // --------------------------------------------------------------------------
  it("renders unordered and ordered lists as real HTML list elements", () => {
    const listMarkdown = `
- Item Alpha
- Item Beta
- Item Gamma

1. First Step
2. Second Step
`;
    const { container } = render(<CoodaraMarkdown content={listMarkdown} />);

    const ulEl = container.querySelector("ul");
    expect(ulEl).not.toBeNull();
    const ulItems = ulEl?.querySelectorAll("li");
    expect(ulItems?.length).toBe(3);

    const olEl = container.querySelector("ol");
    expect(olEl).not.toBeNull();
    const olItems = olEl?.querySelectorAll("li");
    expect(olItems?.length).toBe(2);

    // Should not show raw dashes at starts of lines
    expect(container.textContent).toContain("Item Alpha");
    expect(container.textContent).toContain("First Step");
  });

  // --------------------------------------------------------------------------
  // 6. Headings
  // --------------------------------------------------------------------------
  it("renders headings as h1, h2, h3 and never exposes raw hashes", () => {
    const headingMarkdown = `
# System Architecture
## Module Dependency Graph
### Observed Reality
`;
    const { container } = render(<CoodaraMarkdown content={headingMarkdown} />);

    expect(container.querySelector("h1")?.textContent).toBe("System Architecture");
    expect(container.querySelector("h2")?.textContent).toBe("Module Dependency Graph");
    expect(container.querySelector("h3")?.textContent).toBe("Observed Reality");

    // Must NOT leak raw # characters
    expect(container.textContent).not.toContain("###");
    expect(container.textContent).not.toContain("##");
  });

  // --------------------------------------------------------------------------
  // 7. Inline Code
  // --------------------------------------------------------------------------
  it("renders inline code within sentences using code elements without raw backticks", () => {
    const inlineCode = "The coordinator `OrderService` communicates with `DatabaseAdapter`.";
    const { container } = render(<CoodaraMarkdown content={inlineCode} />);

    const codeTags = container.querySelectorAll("code");
    expect(codeTags.length).toBe(2);
    expect(codeTags[0].textContent).toBe("OrderService");
    expect(codeTags[1].textContent).toBe("DatabaseAdapter");

    // Must NOT display raw backticks
    expect(container.textContent).not.toContain("`");
  });

  // --------------------------------------------------------------------------
  // 8. Mixed Markdown + Structured Content
  // --------------------------------------------------------------------------
  it("renders mixed markdown with tables and formatted content", () => {
    const mixed = `
| Component | Metric | Status |
| --- | --- | --- |
| \`UserService\` | **0.85** | Stable |
| \`OrderService\` | **0.12** | Warning |
`;
    const { container } = render(<CoodaraMarkdown content={mixed} />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();
    const headers = container.querySelectorAll("th");
    expect(headers.length).toBe(3);
    expect(headers[0].textContent).toBe("Component");

    const strongs = container.querySelectorAll("strong");
    expect(strongs.length).toBe(2);
    expect(strongs[0].textContent).toBe("0.85");
  });
});
