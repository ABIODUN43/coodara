/**
 * Architecture Memory API client for Coodara V2.
 */

import { api } from "./client";

export interface ArchitectureComponent {
  id: number;
  name: string;
  component_type: string;
  path?: string | null;
  description?: string | null;
  status: "active" | "removed" | "upgraded";
  first_seen_analysis_id?: number | null;
  last_seen_analysis_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArchitectureTechnologyMemory {
  id: number;
  technology: string;
  version?: string | null;
  category?: string | null;
  status: "active" | "removed" | "upgraded";
  first_seen_analysis_id?: number | null;
  last_seen_analysis_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ArchitectureMemoryEntry {
  id: number;
  memory_id: number;
  organization_id: number;
  repository_id: number;
  analysis_id?: number | null;
  memory_type: string;
  title: string;
  content: string;
  confidence: number;
  source_analyzer?: string | null;
  source_file?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchitectureEvent {
  id: number;
  organization_id: number;
  repository_id: number;
  analysis_id: number;
  event_type: string;
  title: string;
  description: string;
  details?: string | null;
  created_at: string;
}

export interface ArchitectureMemoryOverview {
  repository_id: number;
  organization_id: number;
  latest_analysis_id?: number | null;
  components_count: number;
  active_components_count: number;
  technologies_count: number;
  entries_count: number;
  events_count: number;
  components: ArchitectureComponent[];
  technologies: ArchitectureTechnologyMemory[];
  entries: ArchitectureMemoryEntry[];
  recent_events: ArchitectureEvent[];
}

export interface ScoredMemoryEntry {
  entry: ArchitectureMemoryEntry;
  score: number;
  matched_terms: string[];
}

export interface MemorySearchResponse {
  query: string;
  total_matches: number;
  results: ScoredMemoryEntry[];
}

export interface ArchitectureHistoryResponse {
  repository_id: number;
  organization_id: number;
  total_events: number;
  events: ArchitectureEvent[];
}

export async function fetchRepositoryMemory(
  orgId: number | string,
  repoId: number | string
): Promise<ArchitectureMemoryOverview> {
  const { data } = await api.get<ArchitectureMemoryOverview>(
    `/organizations/${orgId}/repositories/${repoId}/memory`
  );
  return data;
}

export async function searchRepositoryMemory(
  orgId: number | string,
  repoId: number | string,
  query: string,
  memoryType?: string
): Promise<MemorySearchResponse> {
  const params: Record<string, string> = { q: query };
  if (memoryType) params.memory_type = memoryType;
  const { data } = await api.get<MemorySearchResponse>(
    `/organizations/${orgId}/repositories/${repoId}/memory/search`,
    { params }
  );
  return data;
}

export async function fetchRepositoryEvents(
  orgId: number | string,
  repoId: number | string,
  offset = 0,
  limit = 50,
  eventType?: string
): Promise<ArchitectureEvent[]> {
  const params: Record<string, string | number> = { offset, limit };
  if (eventType) params.event_type = eventType;
  const { data } = await api.get<ArchitectureEvent[]>(
    `/organizations/${orgId}/repositories/${repoId}/memory/events`,
    { params }
  );
  return data;
}

export async function fetchRepositoryHistory(
  orgId: number | string,
  repoId: number | string,
  offset = 0,
  limit = 50
): Promise<ArchitectureHistoryResponse> {
  const { data } = await api.get<ArchitectureHistoryResponse>(
    `/organizations/${orgId}/repositories/${repoId}/architecture/history`,
    { params: { offset, limit } }
  );
  return data;
}
