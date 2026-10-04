import { api } from "@/api/client";

export interface ChatMessageHistoryItem {
  role: "user" | "assistant";
  content: string;
}

export interface ObservedItem {
  statement: string;
  evidence_ids?: string[];
}

export interface StructuralImpactItem {
  statement: string;
  type?: "direct" | "indirect" | string;
  entity_ids?: string[];
  evidence_ids?: string[];
}

export interface InferenceItem {
  statement: string;
  basis?: string[];
  language?: string;
}

export interface UnknownItem {
  statement: string;
  reason: string;
}

export interface ReasoningConfidence {
  structural: string;
  evidence: string;
  runtime: string;
}

export interface EvidenceItem {
  id: string;
  repository_path: string;
  entity_id: string;
  commit_sha?: string | null;
  relationship: string;
  why_supports: string;
}

export interface AlternativeOption {
  id: string;
  name: string;
  intervention: string;
  summary: string;
  direct_breakage_count: number;
  indirect_impact_count: number;
}

export interface ActionItem {
  type: string;
  label: string;
  target?: string | null;
  intervention?: string | null;
  file_path?: string | null;
}

export interface StructuredReasoningResult {
  summary: string;
  target_component?: string | null;
  candidates?: string[];
  observed: ObservedItem[];
  structural_impacts: StructuralImpactItem[];
  inferences: InferenceItem[];
  unknowns: UnknownItem[];
  confidence: ReasoningConfidence;
  evidence: EvidenceItem[];
  alternatives: AlternativeOption[];
  actions: ActionItem[];
}

export interface ChatMessageResponse {
  message: string;
  model: string;
  evidence?: string[];
  confidence?: string;
  structured_reasoning?: StructuredReasoningResult | null;
  session_id?: number | null;
}

export interface ChatSessionResponse {
  id: number;
  organization_id: number;
  repository_id?: number | null;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatSessionListResponse {
  items: ChatSessionResponse[];
  total: number;
}

export interface ChatMessageItemResponse {
  id: number;
  session_id: number;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  confidence?: string | null;
  structured_reasoning?: StructuredReasoningResult | null;
  created_at: string;
}

export interface ChatMessageListResponse {
  session_id: number;
  items: ChatMessageItemResponse[];
}

export async function listChatSessions(
  orgId: number,
  repoId?: number
): Promise<ChatSessionListResponse> {
  const params: Record<string, string | number> = {};
  if (repoId !== undefined) {
    params.repository_id = repoId;
  }
  const response = await api.get<ChatSessionListResponse>(
    `/organizations/${orgId}/chat/sessions`,
    { params }
  );
  return response.data;
}

export async function createChatSession(
  orgId: number,
  repoId?: number,
  title: string = "Architecture Chat"
): Promise<ChatSessionResponse> {
  const params: Record<string, string | number> = { title };
  if (repoId !== undefined) {
    params.repository_id = repoId;
  }
  const response = await api.post<ChatSessionResponse>(
    `/organizations/${orgId}/chat/sessions`,
    null,
    { params }
  );
  return response.data;
}

export async function getSessionMessages(
  orgId: number,
  sessionId: number
): Promise<ChatMessageListResponse> {
  const response = await api.get<ChatMessageListResponse>(
    `/organizations/${orgId}/chat/sessions/${sessionId}/messages`
  );
  return response.data;
}

export async function deleteChatSession(
  orgId: number,
  sessionId: number
): Promise<void> {
  await api.delete(`/organizations/${orgId}/chat/sessions/${sessionId}`);
}

export async function sendOrganizationChatMessage(
  orgId: number,
  message: string,
  conversationHistory?: ChatMessageHistoryItem[],
  sessionId?: number
): Promise<ChatMessageResponse> {
  const response = await api.post<ChatMessageResponse>(
    `/organizations/${orgId}/chat`,
    {
      message,
      session_id: sessionId ?? null,
      conversation_history: conversationHistory || [],
    },
    {
      timeout: 60000,
    }
  );
  return response.data;
}

export async function sendRepositoryChatMessage(
  orgId: number,
  repoId: number,
  message: string,
  conversationHistory?: ChatMessageHistoryItem[],
  sessionId?: number
): Promise<ChatMessageResponse> {
  const response = await api.post<ChatMessageResponse>(
    `/organizations/${orgId}/repositories/${repoId}/chat`,
    {
      message,
      session_id: sessionId ?? null,
      conversation_history: conversationHistory || [],
    },
    {
      timeout: 60000,
    }
  );
  return response.data;
}
