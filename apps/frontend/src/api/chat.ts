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
}

export async function sendOrganizationChatMessage(
  orgId: number,
  message: string,
  conversationHistory?: ChatMessageHistoryItem[]
): Promise<ChatMessageResponse> {
  const response = await api.post<ChatMessageResponse>(
    `/organizations/${orgId}/chat`,
    {
      message,
      conversation_history: conversationHistory || [],
    }
  );
  return response.data;
}

export async function sendRepositoryChatMessage(
  orgId: number,
  repoId: number,
  message: string,
  conversationHistory?: ChatMessageHistoryItem[]
): Promise<ChatMessageResponse> {
  const response = await api.post<ChatMessageResponse>(
    `/organizations/${orgId}/repositories/${repoId}/chat`,
    {
      message,
      conversation_history: conversationHistory || [],
    }
  );
  return response.data;
}
