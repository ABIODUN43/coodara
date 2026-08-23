// TEMP mock data for the Architecture page, per the integration contract's
// own MVP rule (§24): "If an endpoint does not exist yet — define the
// TypeScript contract, create mock data locally, build the UI, keep API
// functions isolated, replace mock implementation when the backend
// endpoint becomes available."
//
// Nothing about this file's *shapes* is fake — every object matches the
// real contract types exactly (ArchitectureNode, ArchitectureEdge, etc.),
// so swapping USE_MOCK_ARCHITECTURE_DATA to false in devFlags.ts later is
// the only change needed once the backend endpoints are live.

import type {
  ArchitectureComponent,
  ArchitectureEdge,
  ArchitectureIssue,
  ArchitectureNode,
  ArchitectureNodeType,
  ArchitectureResponse,
} from "@/types/architecture";

interface RawNode {
  id: string;
  label: string;
  type: ArchitectureNodeType;
  desc: string;
  tech: string[];
}

const RAW_NODES: RawNode[] = [
  { id: "AuthService", label: "Auth Service", type: "service", desc: "Handles sign-in, token issuance, and session bootstrapping.", tech: ["TypeScript"] },
  { id: "ApiClientService", label: "API Client", type: "service", desc: "Central HTTP client wrapping all calls to the Coodara backend.", tech: ["TypeScript", "Axios"] },
  { id: "NotificationService", label: "Notifications", type: "service", desc: "In-app and push notification delivery.", tech: ["TypeScript"] },
  { id: "AnalyticsService", label: "Analytics", type: "service", desc: "Product usage event tracking.", tech: ["TypeScript"] },
  { id: "RoutingService", label: "Routing", type: "service", desc: "Client-side route resolution and guards.", tech: ["Next.js"] },
  { id: "SessionService", label: "Session", type: "service", desc: "Session lifecycle and token refresh.", tech: ["TypeScript"] },
  { id: "FeatureFlagService", label: "Feature Flags", type: "service", desc: "Runtime feature flag evaluation.", tech: ["TypeScript"] },
  { id: "FormValidation", label: "Form Validation", type: "module", desc: "Shared schema-based form validation utilities.", tech: ["Zod"] },
  { id: "Logger", label: "Logger", type: "module", desc: "Structured client-side logging.", tech: ["TypeScript"] },
  { id: "ErrorBoundary", label: "Error Boundary", type: "module", desc: "Top-level React error boundary and fallback UI.", tech: ["React"] },
  { id: "ThemeProvider", label: "Theme Provider", type: "module", desc: "Design token resolution and theming context.", tech: ["React"] },
  { id: "StateStore", label: "State Store", type: "module", desc: "Global client state management.", tech: ["Zustand"] },
  { id: "UiComponents", label: "ui-components", type: "package", desc: "Shared internal component library.", tech: ["React"] },
  { id: "DesignTokens", label: "design-tokens", type: "package", desc: "Shared color, spacing, and type tokens.", tech: ["TypeScript"] },
  { id: "LocalCache", label: "Local Cache", type: "database", desc: "Client-side IndexedDB cache for offline reads.", tech: ["IndexedDB"] },
  { id: "CoodaraBackendAPI", label: "Coodara Backend API", type: "external", desc: "The organization's FastAPI backend.", tech: ["FastAPI"] },
  { id: "GitHubOAuth", label: "GitHub OAuth", type: "external", desc: "Third-party authentication provider.", tech: [] },
  { id: "SegmentAnalytics", label: "Segment", type: "external", desc: "Third-party analytics pipeline.", tech: [] },
  { id: "Sentry", label: "Sentry", type: "external", desc: "Third-party error tracking.", tech: [] },
  { id: "BackgroundSyncQueue", label: "Background Sync", type: "queue", desc: "Service-worker background sync queue for offline writes.", tech: ["Workbox"] },
];

const RAW_EDGES: [string, string][] = [
  ["AuthService", "CoodaraBackendAPI"],
  ["AuthService", "GitHubOAuth"],
  ["AuthService", "SessionService"],
  ["AuthService", "FormValidation"],
  ["ApiClientService", "CoodaraBackendAPI"],
  ["ApiClientService", "AuthService"],
  ["SessionService", "ApiClientService"],
  ["SessionService", "LocalCache"],
  ["NotificationService", "ApiClientService"],
  ["NotificationService", "SegmentAnalytics"],
  ["NotificationService", "FormValidation"],
  ["AnalyticsService", "SegmentAnalytics"],
  ["RoutingService", "AuthService"],
  ["RoutingService", "StateStore"],
  ["FeatureFlagService", "ApiClientService"],
  ["Logger", "Sentry"],
  ["ErrorBoundary", "Logger"],
  ["StateStore", "ApiClientService"],
  ["StateStore", "LocalCache"],
  ["StateStore", "UiComponents"],
  ["UiComponents", "ThemeProvider"],
  ["UiComponents", "DesignTokens"],
  ["ThemeProvider", "DesignTokens"],
  ["BackgroundSyncQueue", "ApiClientService"],
  ["BackgroundSyncQueue", "LocalCache"],
];

const MOCK_EDGES: ArchitectureEdge[] = RAW_EDGES.map(([source, target]) => ({
  id: `${source}__${target}`,
  source,
  target,
  type: "dependency",
}));

const MOCK_ISSUES: ArchitectureIssue[] = [
  {
    id: "i1",
    title: "Circular Dependency",
    description:
      "ApiClientService, AuthService, and SessionService form a dependency cycle. Changes to any one risk destabilizing the others and make isolated testing difficult.",
    severity: "critical",
    type: "circular_dependency",
    component_ids: ["ApiClientService", "AuthService", "SessionService"],
    evidence_ids: ["evidence-1"],
  },
  {
    id: "i2",
    title: "Unprotected External Call",
    description:
      "Notifications call Segment directly with no retry or circuit breaker. A Segment outage can block the notification send path.",
    severity: "critical",
    type: "architectural_smell",
    component_ids: ["NotificationService"],
    evidence_ids: ["evidence-2"],
  },
  {
    id: "i3",
    title: "High Coupling",
    description:
      "API Client has a high number of dependents and dependencies — well above the rest of the codebase. Most components reach the backend through it, which is by design, but it also means any change here has wide blast radius.",
    severity: "warning",
    type: "high_coupling",
    component_ids: ["ApiClientService"],
    evidence_ids: ["evidence-3"],
  },
  {
    id: "i4",
    title: "Boundary Concern",
    description:
      "The state layer depends directly on the component package. State/logic code is not expected to reach into presentation packages.",
    severity: "warning",
    type: "boundary_violation",
    component_ids: ["StateStore"],
    evidence_ids: ["evidence-4"],
  },
  {
    id: "i5",
    title: "Missing Error Handling",
    description:
      "Background Sync has no dependency on Logger or Error Boundary, so failed sync attempts are currently silent.",
    severity: "warning",
    type: "architectural_smell",
    component_ids: ["BackgroundSyncQueue"],
    evidence_ids: ["evidence-5"],
  },
  {
    id: "i6",
    title: "Underused Package",
    description:
      "design-tokens has very few dependents. Consider folding it into ui-components if it doesn't grow further.",
    severity: "info",
    type: "unknown",
    component_ids: ["DesignTokens"],
    evidence_ids: ["evidence-6"],
  },
  {
    id: "i7",
    title: "New Dependency Detected",
    description:
      "This dependency is new since the last analysis — part of the offline-writes feature merged this week.",
    severity: "info",
    type: "unknown",
    component_ids: ["BackgroundSyncQueue"],
    evidence_ids: ["evidence-7"],
  },
];

function dependenciesOf(id: string): string[] {
  return MOCK_EDGES.filter((e) => e.source === id).map((e) => e.target);
}
function dependentsOf(id: string): string[] {
  return MOCK_EDGES.filter((e) => e.target === id).map((e) => e.source);
}
function issuesOf(id: string): ArchitectureIssue[] {
  return MOCK_ISSUES.filter((i) => i.component_ids.includes(id));
}

const MOCK_NODES: ArchitectureNode[] = RAW_NODES.map((n) => ({
  id: n.id,
  name: n.label,
  type: n.type,
  description: n.desc,
  technology: n.tech.length ? n.tech.join(", ") : null,
  dependency_count: dependenciesOf(n.id).length,
  dependent_count: dependentsOf(n.id).length,
  issue_count: issuesOf(n.id).length,
}));

const nodeById: Record<string, RawNode> = {};
RAW_NODES.forEach((n) => (nodeById[n.id] = n));

export function getMockArchitecture(repositoryId: string): ArchitectureResponse {
  return {
    repository_id: repositoryId,
    status: "completed",
    analyzed_at: new Date().toISOString(),
    summary: {
      health_score: 82,
      components: MOCK_NODES.length,
      dependencies: MOCK_EDGES.length,
      issues: MOCK_ISSUES.length,
    },
    graph: {
      nodes: MOCK_NODES,
      edges: MOCK_EDGES,
    },
  };
}

export function getMockInsights(): ArchitectureIssue[] {
  return MOCK_ISSUES;
}

export function getMockComponent(componentId: string): ArchitectureComponent | null {
  const raw = nodeById[componentId];
  if (!raw) return null;

  return {
    id: raw.id,
    name: raw.label,
    type: raw.type,
    description: raw.desc,
    technology: raw.tech.length ? raw.tech.join(", ") : null,
    dependencies: dependenciesOf(raw.id).map((id) => ({
      id,
      name: nodeById[id]?.label ?? id,
      type: nodeById[id]?.type ?? "module",
    })),
    dependents: dependentsOf(raw.id).map((id) => ({
      id,
      name: nodeById[id]?.label ?? id,
      type: nodeById[id]?.type ?? "module",
    })),
    issues: issuesOf(raw.id),
  };
}