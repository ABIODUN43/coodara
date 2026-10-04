import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CoodaraFindingCard } from "@/components/dashboard/CoodaraFindingCard";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("CoodaraFindingCard Layout & Wrapping (Bug 3 Regression)", () => {
  const longJavaPathFinding = {
    repoName: "apache/kafka",
    repoId: 42,
    issue: {
      id: "issue-cycle-999",
      title: "Circular dependency in network protocol components",
      description:
        "Circular dependency: /org/apache/kafka/common/network/Selector.java -> /org/apache/kafka/common/protocol/Errors.java -> /org/apache/kafka/common/record/MemoryRecords.java -> /org/apache/kafka/common/network/NetworkReceive.java -> /org/apache/kafka/common/network/Selector.java",
      severity: "critical" as const,
      type: "circular_dependency",
      status: "open",
    },
  };

  it("renders with bounded overflow-hidden container and break-all text wrapping", () => {
    const { container } = render(
      <MemoryRouter>
        <CoodaraFindingCard
          issues={[longJavaPathFinding as any]}
          recommendations={[]}
          organizationId={1}
        />
      </MemoryRouter>
    );

    // Root card must have overflow protection
    const cardRoot = container.firstElementChild as HTMLElement;
    expect(cardRoot.className).toContain("overflow-hidden");
    expect(cardRoot.className).toContain("max-w-full");

    // Title must wrap words
    const titleElement = screen.getByText("Circular dependency in network protocol components");
    expect(titleElement.className).toContain("break-words");

    // Evidence block must contain break-all and max-h scrolling
    const evidenceText = screen.getByText(/org\/apache\/kafka\/common\/network\/Selector\.java/);
    expect(evidenceText.className).toContain("break-all");
    expect(evidenceText.className).toContain("break-words");

    // Container of evidence has max-h-36 overflow-y-auto
    const evidenceContainer = evidenceText.parentElement;
    expect(evidenceContainer?.className).toContain("overflow-y-auto");
  });

  it("navigates to /findings and /chat and /lab when CTA buttons are clicked", () => {
    render(
      <MemoryRouter>
        <CoodaraFindingCard
          issues={[longJavaPathFinding as any]}
          recommendations={[]}
          organizationId={1}
        />
      </MemoryRouter>
    );

    const inspectBtn = screen.getByText("Inspect Evidence");
    fireEvent.click(inspectBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/findings?finding=issue-cycle-999");

    const askBtn = screen.getByText("Ask Coodara");
    fireEvent.click(askBtn);
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/chat?query=Explain%20risk%3A")
    );

    const whatIfBtn = screen.getByText("Run What-If");
    fireEvent.click(whatIfBtn);
    expect(mockNavigate).toHaveBeenCalledWith("/lab");
  });
});
