import type { Repository } from "@/types/repository";

export const MOCK_REPOSITORIES: Repository[] = [
  {
    id: 9101,
    organization_id: 9001,
    github_id: 555001,
    name: "coodara-frontend",
    full_name: "acme-engineering/coodara-frontend",
    description: "Customer-facing dashboard (React + Vite)",
    visibility: "private",
    default_branch: "main",
    primary_language: "TypeScript",
    clone_url: "https://github.com/acme-engineering/coodara-frontend.git",
    html_url: "https://github.com/acme-engineering/coodara-frontend",
    last_synced_at: "2026-08-23T10:00:00Z",
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-08-23T10:00:00Z",
  },
  {
    id: 9102,
    organization_id: 9001,
    github_id: 555002,
    name: "coodara-backend",
    full_name: "acme-engineering/coodara-backend",
    description: "Core REST API (FastAPI)",
    visibility: "private",
    default_branch: "main",
    primary_language: "Python",
    clone_url: "https://github.com/acme-engineering/coodara-backend.git",
    html_url: "https://github.com/acme-engineering/coodara-backend",
    last_synced_at: null,
    created_at: "2026-03-15T09:00:00Z",
    updated_at: "2026-03-15T09:00:00Z",
  },
  {
    id: 9103,
    organization_id: 9001,
    github_id: 555003,
    name: "payment-service",
    full_name: "acme-engineering/payment-service",
    description: "Billing and invoicing microservice",
    visibility: "private",
    default_branch: "main",
    primary_language: "Go",
    clone_url: "https://github.com/acme-engineering/payment-service.git",
    html_url: "https://github.com/acme-engineering/payment-service",
    last_synced_at: "2026-08-20T14:00:00Z",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-08-20T14:00:00Z",
  },
];

export function getMockRepositoriesForOrg(orgId: string | number): Repository[] {
  return MOCK_REPOSITORIES.filter((r) => String(r.organization_id) === String(orgId));
}

export function getMockRepository(repoId: string | number): Repository | undefined {
  return MOCK_REPOSITORIES.find((r) => String(r.id) === String(repoId));
}