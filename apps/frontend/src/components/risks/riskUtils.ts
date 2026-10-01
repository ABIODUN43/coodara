import type { ArchitectureIssue, ArchitectureIssueSeverity } from "@/types/architecture";

export interface GroundedEvidence {
  primaryComponent?: string;
  filePath?: string;
  cycleNodes?: string[];
  afferentCoupling?: number; // Ca
  efferentCoupling?: number; // Ce
  instability?: {
    source: string;
    sourceI: number;
    target: string;
    targetI: number;
  };
  complexity?: number;
  boundaryViolation?: string;
}

/**
 * Extracts real, deterministic data from backend analysis output.
 * If a field is not present in the backend description or metadata,
 * it is strictly left undefined. No data is manufactured.
 */
export function parseGroundedEvidence(issue: ArchitectureIssue): GroundedEvidence {
  const result: GroundedEvidence = {};
  const desc = issue.description || "";
  const title = issue.title || "";

  // 1. Primary component from component_ids if available
  if (issue.component_ids && issue.component_ids.length > 0) {
    result.primaryComponent = issue.component_ids[0];
  }

  // 2. Circular dependency cycle path: e.g. "Circular dependency detected: 'A' -> 'B' -> 'C'."
  const cycleMatch = desc.match(/Circular dependency detected:\s*(.+?)(?:\.|$)/i);
  if (cycleMatch && cycleMatch[1]) {
    const rawNodes = cycleMatch[1]
      .split("->")
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
    if (rawNodes.length > 0) {
      result.cycleNodes = rawNodes;
      if (!result.primaryComponent) {
        result.primaryComponent = rawNodes[0];
      }
    }
  }

  // 3. Architectural Hub: e.g. "Architectural Hub: Module 'X' has high afferent coupling (Ca=12) and high efferent coupling (Ce=15)."
  const hubMatch = desc.match(
    /Architectural Hub:\s*Module\s*['"](.+?)['"]\s*has high afferent coupling\s*\(Ca=(\d+)\)\s*and high efferent coupling\s*\(Ce=(\d+)\)/i
  );
  if (hubMatch) {
    if (!result.primaryComponent) result.primaryComponent = hubMatch[1];
    result.afferentCoupling = parseInt(hubMatch[2], 10);
    result.efferentCoupling = parseInt(hubMatch[3], 10);
  }

  // 4. Unstable Dependency: e.g. "Unstable Dependency: Stable module 'A' (I=0.10) depends on unstable module 'B' (I=0.85)."
  const unstableMatch = desc.match(
    /Unstable Dependency:\s*Stable module\s*['"](.+?)['"]\s*\(I=([\d.]+)\)\s*depends on unstable module\s*['"](.+?)['"]\s*\(I=([\d.]+)\)/i
  );
  if (unstableMatch) {
    if (!result.primaryComponent) result.primaryComponent = unstableMatch[1];
    result.instability = {
      source: unstableMatch[1],
      sourceI: parseFloat(unstableMatch[2]),
      target: unstableMatch[3],
      targetI: parseFloat(unstableMatch[4]),
    };
  }

  // 5. Dependency hotspot: e.g. "Module 'X' has 14 outgoing dependencies."
  const hotspotMatch = desc.match(/Module\s*['"](.+?)['"]\s*has\s*(\d+)\s*outgoing dependencies/i);
  if (hotspotMatch) {
    if (!result.primaryComponent) result.primaryComponent = hotspotMatch[1];
    result.efferentCoupling = parseInt(hotspotMatch[2], 10);
  }

  // 6. Generic module extraction: e.g. "Module 'X' ..." or "Component 'X' ..."
  if (!result.primaryComponent) {
    const genericModuleMatch = (desc + " " + title).match(/(?:Module|Component)\s*['"](.+?)['"]/i);
    if (genericModuleMatch) {
      result.primaryComponent = genericModuleMatch[1];
    }
  }

  // 7. Complexity hotspot: e.g. "Repository has high aggregate cyclomatic complexity (24.5)."
  const complexityMatch = desc.match(/aggregate (?:cyclomatic )?complexity\s*\(([\d.]+)\)/i);
  if (complexityMatch) {
    result.complexity = parseFloat(complexityMatch[1]);
  }

  // 8. Boundary violation
  const boundaryMatch = desc.match(/Boundary violation:\s*(.+?)(?:\.|$)/i);
  if (boundaryMatch) {
    result.boundaryViolation = boundaryMatch[1];
  }

  // 9. File path inference if primaryComponent looks like a file path
  if (result.primaryComponent && (result.primaryComponent.includes("/") || result.primaryComponent.includes("\\") || result.primaryComponent.includes("."))) {
    result.filePath = result.primaryComponent;
  }

  return result;
}

/**
 * Returns human-readable presentation labels and styling classes
 * preserving the backend's canonical severity taxonomy.
 */
export function getSeverityStyle(severity: string | ArchitectureIssueSeverity): {
  label: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  dotClass: string;
} {
  const normalized = (severity || "").toLowerCase();
  switch (normalized) {
    case "critical":
      return {
        label: "CRITICAL",
        badgeClass: "bg-[var(--cd-bad-soft)] text-[var(--cd-bad)] border border-[var(--cd-bad)]/30",
        borderClass: "border-[var(--cd-bad)]/40 hover:border-[var(--cd-bad)]",
        textClass: "text-[var(--cd-bad)]",
        dotClass: "bg-[var(--cd-bad)]",
      };
    case "high":
    case "warning":
      return {
        label: normalized === "high" ? "HIGH" : "WARNING",
        badgeClass: "bg-[var(--cd-warn-soft)] text-[var(--cd-warn)] border border-[var(--cd-warn)]/30",
        borderClass: "border-[var(--cd-warn)]/40 hover:border-[var(--cd-warn)]",
        textClass: "text-[var(--cd-warn)]",
        dotClass: "bg-[var(--cd-warn)]",
      };
    case "medium":
      return {
        label: "MEDIUM",
        badgeClass: "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] border border-[var(--cd-accent)]/30",
        borderClass: "border-[var(--cd-border)] hover:border-[var(--cd-accent)]",
        textClass: "text-[var(--cd-accent)]",
        dotClass: "bg-[var(--cd-accent)]",
      };
    case "low":
    case "info":
    default:
      return {
        label: normalized === "low" ? "LOW" : "INFO",
        badgeClass: "bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] border border-[var(--cd-border)]",
        borderClass: "border-[var(--cd-border)] hover:border-[var(--cd-ink-soft)]",
        textClass: "text-[var(--cd-ink-soft)]",
        dotClass: "bg-[var(--cd-ink-soft)]",
      };
  }
}

/**
 * Cleanly formats component name for display
 */
export function formatComponentName(name?: string): string {
  if (!name) return "Unknown Component";
  const clean = name.replace(/\\/g, "/").replace(/\/$/, "");
  const base = clean.split("/").pop() || clean;
  return base;
}

/**
 * Restrained architectural significance statement.
 * Strictly adheres to Constraint 2 (no unsupported causal claims).
 */
export function getRestrainedImpactStatement(recommendationPlan?: string | null): string {
  if (recommendationPlan && recommendationPlan.trim().length > 0) {
    return recommendationPlan;
  }
  return "This finding indicates a structural relationship identified by static dependency analysis.";
}
