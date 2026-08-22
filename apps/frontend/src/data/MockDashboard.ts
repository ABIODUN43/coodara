// TEMP mock data — swap each array/lookup for real API calls once the
// backend exists. Shapes are deliberately close to what those endpoints
// will likely return, so wiring up fetch calls later should be a mostly
// mechanical swap inside the pages that import these.

export type Role = "owner" | "admin" | "member";
export type Band = "good" | "warn" | "risk";

export interface Organization {
  id: string;
  name: string;
  role: Role;
  members: number;
  repos: number;
  health: number;
  band: Band;
}

export interface Repo {
  id: string;
  name: string;
  desc: string;
  lang: string;
  langColor: string;
  score: number; // out of 10
  updatedLabel: string;
  updatedRank: number; // lower = more recent, used for "recently updated" sort
}

export interface Member {
  id: string;
  name: string;
  handle: string;
  role: Role;
}

export interface ActivityEntry {
  id: string;
  text: string;
  time: string;
}

export const BAND: Record<Band, { color: string; bg: string; label: string }> = {
  good: { color: "var(--cd-good)", bg: "var(--cd-good-bg)", label: "Healthy" },
  warn: { color: "var(--cd-warn)", bg: "var(--cd-warn-bg)", label: "Watch" },
  risk: { color: "var(--cd-risk)", bg: "var(--cd-risk-bg)", label: "At risk" },
};

export function bandFor(score10: number): Band {
  return score10 >= 8 ? "good" : score10 >= 5 ? "warn" : "risk";
}

export const initialOrganizations: Organization[] = [
  { id: "meridian", name: "Meridian Systems", role: "owner", members: 4, repos: 12, health: 92, band: "good" },
  { id: "northfield", name: "Northfield Labs", role: "admin", members: 2, repos: 3, health: 78, band: "warn" },
  { id: "vela", name: "Vela Robotics", role: "member", members: 6, repos: 9, health: 65, band: "risk" },
];

export const LANG_COLOR: Record<string, string> = {
  TypeScript: "#3178C6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#DEA584",
  Ruby: "#701516",
};

export const repos: Repo[] = [
  { id: "frontend-app", name: "frontend-app", desc: "Customer-facing web application (Next.js)", lang: "TypeScript", langColor: LANG_COLOR.TypeScript, score: 9.2, updatedLabel: "2h ago", updatedRank: 1 },
  { id: "backend-api", name: "backend-api", desc: "Core REST + GraphQL API gateway", lang: "Go", langColor: LANG_COLOR.Go, score: 8.4, updatedLabel: "1h ago", updatedRank: 0 },
  { id: "api-gateway", name: "api-gateway", desc: "Edge routing, auth, and rate limiting", lang: "Go", langColor: LANG_COLOR.Go, score: 7.1, updatedLabel: "2d ago", updatedRank: 4 },
  { id: "analytics-service", name: "analytics-service", desc: "Event ingestion and usage analytics pipeline", lang: "Python", langColor: LANG_COLOR.Python, score: 8.8, updatedLabel: "3d ago", updatedRank: 5 },
  { id: "payment-service", name: "payment-service", desc: "Payments, invoicing, and billing integrations", lang: "TypeScript", langColor: LANG_COLOR.TypeScript, score: 5.6, updatedLabel: "Today", updatedRank: 0.5 },
  { id: "notification-service", name: "notification-service", desc: "Transactional email, SMS, and push delivery", lang: "Go", langColor: LANG_COLOR.Go, score: 6.9, updatedLabel: "5d ago", updatedRank: 7 },
  { id: "auth-service", name: "auth-service", desc: "Session handling, SSO, and permissions", lang: "Go", langColor: LANG_COLOR.Go, score: 4.3, updatedLabel: "6d ago", updatedRank: 8 },
  { id: "user-service", name: "user-service", desc: "User profiles, preferences, and account state", lang: "Go", langColor: LANG_COLOR.Go, score: 6.1, updatedLabel: "6d ago", updatedRank: 8 },
  { id: "billing-service", name: "billing-service", desc: "Subscription plans, invoices, and metered usage", lang: "TypeScript", langColor: LANG_COLOR.TypeScript, score: 8.1, updatedLabel: "4d ago", updatedRank: 6 },
  { id: "mobile-app", name: "mobile-app", desc: "iOS and Android client (React Native)", lang: "TypeScript", langColor: LANG_COLOR.TypeScript, score: 8.9, updatedLabel: "1d ago", updatedRank: 3 },
  { id: "docs-site", name: "docs-site", desc: "Public developer documentation and API reference", lang: "TypeScript", langColor: LANG_COLOR.TypeScript, score: 9.5, updatedLabel: "9d ago", updatedRank: 10 },
  { id: "infra", name: "infra", desc: "Terraform modules and deployment pipelines", lang: "Rust", langColor: LANG_COLOR.Rust, score: 8.6, updatedLabel: "12d ago", updatedRank: 12 },
];

export const members: Member[] = [
  { id: "saheedazeem", name: "Saheed Azeem", handle: "saheedazeem", role: "owner" },
  { id: "priyan", name: "Priya Nair", handle: "priyan", role: "admin" },
  { id: "samokafor", name: "Sam Okafor", handle: "samokafor", role: "member" },
  { id: "elenak", name: "Elena Kruger", handle: "elenak", role: "member" },
];

export const activity: ActivityEntry[] = [
  { id: "1", text: "Analysis completed for backend-api — architecture score +5", time: "2h ago" },
  { id: "2", text: "analytics-service imported by Sam Okafor", time: "1d ago" },
  { id: "3", text: "Priya Nair promoted to Admin", time: "3d ago" },
  { id: "4", text: "Circular dependency resolved in payment-service", time: "6d ago" },
  { id: "5", text: "api-gateway split out from backend-api", time: "9d ago" },
];