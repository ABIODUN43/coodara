import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageSquare,
  Send,
  Sparkles,
  RefreshCw,
  GitBranch,
  Building2,
  ShieldAlert,
  Code2,
  Zap,
  Copy,
  Check,
  Cpu,
  Plus,
  Play,
  AlertCircle,
} from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { listRepositories } from "@/api/repositories";
import { startAnalysis } from "@/api/analyses";
import { useDashboardOverview } from "@/hooks/useDashboardOverview";
import {
  sendOrganizationChatMessage,
  sendRepositoryChatMessage,
  listChatSessions,
  createChatSession,
  getSessionMessages,
  type ChatMessageHistoryItem,
  type StructuredReasoningResult,
  type ChatSessionResponse,
} from "@/api/chat";
import type { Repository } from "@/types/repository";
import { StructuredReasoningView } from "@/components/chat/StructuredReasoningView";
import { CoodaraMarkdown } from "@/components/chat/CoodaraMarkdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model?: string;
  timestamp: string;
  structured_reasoning?: StructuredReasoningResult | null;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Code2,
    title: "Dependency Structure",
    prompt: "Explain the module dependency structure and how services connect.",
  },
  {
    icon: ShieldAlert,
    title: "Coupling & Risks",
    prompt: "Why is this service tightly coupled and what are the circular dependencies?",
  },
  {
    icon: GitBranch,
    title: "Change Simulation",
    prompt: "What happens if I remove or refactor the highest-coupling coordinator?",
  },
  {
    icon: Zap,
    title: "Refactoring Roadmap",
    prompt: "Give me a step-by-step 7-phase modernization and refactoring action plan.",
  },
];

export function AIAssistantPage() {
  const location = useLocation();
  const { activeProject, loading: orgsLoading } = useProject();
  const { repoData, refreshOverview } = useDashboardOverview();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<number | "all">("all");

  const [sessions, setSessions] = useState<ChatSessionResponse[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [triggeringAnalysis, setTriggeringAnalysis] = useState(false);
  const [analysisTriggerMessage, setAnalysisTriggerMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync incoming prompt or repo selection from finding navigation
  useEffect(() => {
    const state = location.state as { prompt?: string; repoId?: number } | null;
    if (state?.prompt) {
      setInputValue(state.prompt);
    }
    if (state?.repoId) {
      setSelectedRepoId(state.repoId);
    }
  }, [location.state]);

  // Load repositories for active project
  useEffect(() => {
    let cancelled = false;

    async function loadRepos() {
      if (!activeProject?.id) return;
      try {
        const res = await listRepositories(activeProject.id, 1, 100);
        if (!cancelled) {
          setRepos(res.items);
        }
      } catch {
        if (!cancelled) setRepos([]);
      }
    }

    void loadRepos();
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  // Load persistent sessions and active conversation history on scope change
  useEffect(() => {
    if (!activeProject?.id) return;
    const orgId = activeProject.id;
    const orgName = activeProject.name;
    let active = true;

    async function loadSessionsAndMessages() {
      setLoadingHistory(true);
      try {
        const repoFilter = selectedRepoId === "all" ? undefined : selectedRepoId;
        const res = await listChatSessions(orgId, repoFilter);
        if (!active) return;

        setSessions(res.items);

        if (res.items.length > 0) {
          const current = res.items[0];
          setActiveSessionId(current.id);
          const msgRes = await getSessionMessages(orgId, current.id);
          if (!active) return;

          if (msgRes.items.length > 0) {
            setMessages(
              msgRes.items.map((m) => ({
                id: String(m.id),
                role: m.role,
                content: m.content,
                model: m.model ?? undefined,
                confidence: m.confidence ?? undefined,
                structured_reasoning: m.structured_reasoning ?? undefined,
                timestamp: new Date(m.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }))
            );
          } else {
            setWelcomeMessage();
          }
        } else {
          setActiveSessionId(null);
          setWelcomeMessage();
        }
      } catch {
        if (active) {
          setWelcomeMessage();
        }
      } finally {
        if (active) {
          setLoadingHistory(false);
        }
      }
    }

    function setWelcomeMessage() {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hello! I am **Coodara AI**, your dedicated software architecture intelligence assistant for **${orgName}**.\n\nI have real-time access to your repository AST code models, dependency graph topology ($G=(V,E)$), and persistent **V2 Architecture Memory**.\n\nSelect a specific repository or ask about your organization's entire portfolio below!`,
          model: "coodara-architecture-engine",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }

    void loadSessionsAndMessages();
    return () => {
      active = false;
    };
  }, [activeProject?.id, activeProject?.name, selectedRepoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Check if selected repository has completed analysis
  const selectedRepoObj = repos.find((r) => r.id === selectedRepoId);
  const selectedRepoAnalysisData = selectedRepoId !== "all"
    ? repoData?.find((rd) => rd.repo.id === selectedRepoId)
    : null;
  const isRepoAnalyzed = selectedRepoId === "all" || Boolean(selectedRepoAnalysisData?.architecture || selectedRepoAnalysisData?.result);

  async function handleStartNewSession() {
    if (!activeProject?.id) return;
    try {
      const repoFilter = selectedRepoId === "all" ? undefined : selectedRepoId;
      const title = selectedRepoObj ? `${selectedRepoObj.name} Chat` : "Organization Architecture Chat";
      const newSession = await createChatSession(activeProject.id, repoFilter, title);
      setActiveSessionId(newSession.id);
      setSessions((prev) => [newSession, ...prev]);
      setMessages([
        {
          id: "new-session",
          role: "assistant",
          content: `Started a new architecture conversation thread for **${selectedRepoObj ? selectedRepoObj.name : activeProject.name}**.\n\nAsk any question regarding service coupling, dependency boundaries, or refactoring impact simulations.`,
          model: "coodara-architecture-engine",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("Failed to create new session:", err);
    }
  }

  async function handleTriggerAnalysis() {
    if (!activeProject?.id || selectedRepoId === "all") return;
    setTriggeringAnalysis(true);
    setAnalysisTriggerMessage(null);
    try {
      await startAnalysis(activeProject.id, selectedRepoId);
      setAnalysisTriggerMessage("Analysis triggered successfully! Coodara is now parsing AST models & dependencies.");
      await refreshOverview();
    } catch (err) {
      setAnalysisTriggerMessage(`Failed to trigger analysis: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setTriggeringAnalysis(false);
    }
  }

  async function handleSend(customPrompt?: string) {
    const text = customPrompt || inputValue.trim();
    if (!text || sending || !activeProject?.id) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Prepare multi-turn history
    const historyPayload: ChatMessageHistoryItem[] = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputValue("");
    setSending(true);

    try {
      let response;
      if (selectedRepoId === "all") {
        response = await sendOrganizationChatMessage(
          activeProject.id,
          text,
          historyPayload,
          activeSessionId ?? undefined
        );
      } else {
        response = await sendRepositoryChatMessage(
          activeProject.id,
          selectedRepoId,
          text,
          historyPayload,
          activeSessionId ?? undefined
        );
      }

      if (response.session_id && response.session_id !== activeSessionId) {
        setActiveSessionId(response.session_id);
      }

      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: response.message,
        model: response.model,
        structured_reasoning: response.structured_reasoning,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg: Message = {
        id: String(Date.now() + 1),
        role: "assistant",
        content: `⚠️ Failed to get a response from Coodara AI (${err instanceof Error ? err.message : "Network error"}). Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function copyText(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (orgsLoading) {
    return (
      <div className="p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
        Loading Chat...
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-[13px] text-[var(--cd-ink-soft)]">
        Please select an organization to use the Architecture Chat.
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col bg-[var(--cd-bg)] px-4 pb-4 pt-3 sm:px-6">
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cd-accent)] text-white shadow-sm">
            <MessageSquare className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold text-[var(--cd-ink)]">
                Coodara Architecture Chat
              </h1>
              <span className="flex items-center gap-1 rounded-full bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--cd-accent)]">
                <Sparkles className="h-2.5 w-2.5" />
                Persistent Multi-Turn Intelligence
              </span>
            </div>
            <p className="text-[11.5px] text-[var(--cd-ink-faint)]">
              Ask deep architectural questions, simulate changes, trace dependencies, and get refactoring blueprints.
            </p>
          </div>
        </div>

        {/* Scope and session controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-[var(--cd-ink-soft)]">Scope:</span>
          <div className="relative">
            <select
              value={selectedRepoId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedRepoId(val === "all" ? "all" : Number(val));
              }}
              className="cursor-pointer appearance-none rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] py-1.5 pl-3 pr-8 text-[12px] font-medium text-[var(--cd-ink)] shadow-sm outline-none hover:bg-[var(--cd-sunken)] focus:border-[var(--cd-accent)]"
            >
              <option value="all">🌐 Entire Organization ({repos.length} repos)</option>
              {repos.map((r) => (
                <option key={r.id} value={r.id}>
                  📦 {r.name}
                </option>
              ))}
            </select>
          </div>

          {sessions.length > 0 && (
            <div className="relative">
              <select
                value={activeSessionId ?? ""}
                onChange={async (e) => {
                  const sId = Number(e.target.value);
                  if (!sId || !activeProject?.id) return;
                  setActiveSessionId(sId);
                  try {
                    const msgRes = await getSessionMessages(activeProject.id, sId);
                    if (msgRes.items.length > 0) {
                      setMessages(
                        msgRes.items.map((m) => ({
                          id: String(m.id),
                          role: m.role,
                          content: m.content,
                          model: m.model ?? undefined,
                          confidence: m.confidence ?? undefined,
                          structured_reasoning: m.structured_reasoning ?? undefined,
                          timestamp: new Date(m.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                        }))
                      );
                    }
                  } catch {
                    // ignore
                  }
                }}
                className="cursor-pointer appearance-none rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] py-1.5 pl-2.5 pr-7 text-[11.5px] font-medium text-[var(--cd-ink)] shadow-sm outline-none hover:bg-[var(--cd-sunken)] focus:border-[var(--cd-accent)]"
                title="Select Saved Conversation Thread"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    💬 {s.title.length > 25 ? s.title.slice(0, 25) + "..." : s.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => void handleStartNewSession()}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)]"
            title="Start New Conversation Thread"
          >
            <Plus className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
            New Thread
          </button>
        </div>
      </div>

      {/* Unanalyzed Repository Banner */}
      {!isRepoAnalyzed && selectedRepoObj && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-[var(--cd-warn-soft)] bg-[var(--cd-warn-soft)]/20 px-3.5 py-2.5 text-[12px] text-[var(--cd-warn)]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{selectedRepoObj.name} has not completed an architecture analysis yet.</strong> Architecture reasoning requires AST code models and dependency graphs to avoid hallucination.
            </span>
          </div>
          <button
            onClick={() => void handleTriggerAnalysis()}
            disabled={triggeringAnalysis}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-[var(--cd-accent)] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50"
          >
            {triggeringAnalysis ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            Run Analysis Now
          </button>
        </div>
      )}

      {analysisTriggerMessage && (
        <div className="mb-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-surface)] px-3 py-2 text-[11.5px] text-[var(--cd-ink-soft)]">
          {analysisTriggerMessage}
        </div>
      )}

      {/* Scope Info Pill */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--cd-surface)] px-3 py-2 text-[11.5px] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[var(--cd-ink)] flex items-center gap-1">
            {selectedRepoId === "all" ? <Building2 className="h-3.5 w-3.5" /> : <GitBranch className="h-3.5 w-3.5" />}
            Context:
          </span>
          <span>
            {selectedRepoId === "all"
              ? `${activeProject.name} — ${repos.length} repositories registered`
              : `${selectedRepoObj?.full_name || selectedRepoObj?.name} (${selectedRepoObj?.primary_language || "Codebase"})`}
          </span>
        </div>
        {activeSessionId && (
          <span className="font-mono text-[10.5px] text-[var(--cd-ink-faint)]">
            Thread #{activeSessionId}
          </span>
        )}
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-4 space-y-4">
        {loadingHistory && (
          <div className="flex items-center justify-center p-4 text-[12px] text-[var(--cd-ink-faint)] gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--cd-accent)]" />
            Restoring persistent conversation history...
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cd-accent)] text-white mt-0.5">
                  <MessageSquare className="h-4 w-4" />
                </div>
              )}

              <div
                className={`group relative max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-[13px] leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-[var(--cd-accent)] text-white rounded-tr-none"
                    : "bg-[var(--cd-sunken)] text-[var(--cd-ink)] border border-[var(--cd-border-soft)] rounded-tl-none"
                }`}
              >
                {!isUser && m.model && (
                  <div className="mb-2 flex items-center justify-between text-[11px] text-[var(--cd-ink-faint)] border-b border-[var(--cd-border-soft)] pb-1.5">
                    <span className="font-mono flex items-center gap-1">
                      <Cpu className="h-3 w-3 text-[var(--cd-accent)]" />
                      {m.model}
                    </span>
                    <button
                      onClick={() => copyText(m.id, m.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 hover:text-[var(--cd-ink)]"
                      title="Copy message"
                    >
                      {copiedId === m.id ? (
                        <Check className="h-3 w-3 text-[var(--cd-good)]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                )}

                {isUser ? (
                  <div className="whitespace-pre-wrap font-sans space-y-2">{m.content}</div>
                ) : m.structured_reasoning ? (
                  <StructuredReasoningView
                    data={m.structured_reasoning}
                    orgId={activeProject?.id}
                    repoId={selectedRepoId}
                    onActionPrompt={(prompt) => void handleSend(prompt)}
                  />
                ) : (
                  <CoodaraMarkdown content={m.content} />
                )}

                <div
                  className={`mt-2 text-[10px] ${
                    isUser ? "text-white/70 text-right" : "text-[var(--cd-ink-faint)]"
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex gap-3 justify-start items-center">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--cd-accent)] text-white">
              <MessageSquare className="h-4 w-4 animate-pulse" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] px-4 py-2.5 text-[12px] text-[var(--cd-ink-soft)] flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[var(--cd-accent)]" />
              Evaluating codebase AST topology & calculating architectural metrics...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (when few messages) */}
      {messages.length <= 2 && !sending && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SUGGESTED_PROMPTS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => void handleSend(item.prompt)}
                className="flex flex-col items-start gap-1 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] p-2.5 text-left text-[11.5px] transition-all hover:border-[var(--cd-accent)] hover:bg-[var(--cd-sunken)] cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-[var(--cd-ink)]">
                  <Icon className="h-3.5 w-3.5 text-[var(--cd-accent)]" />
                  {item.title}
                </div>
                <div className="line-clamp-2 text-[10.5px] text-[var(--cd-ink-faint)]">
                  {item.prompt}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Area */}
      <div className="mt-3 flex gap-2">
        <textarea
          rows={2}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask Coodara about ${
            selectedRepoId === "all" ? "the whole architecture" : selectedRepoObj?.name ?? "this codebase"
          }... (Press Enter to send)`}
          className="flex-1 resize-none rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-3 text-[13px] text-[var(--cd-ink)] outline-none placeholder:text-[var(--cd-ink-faint)] focus:border-[var(--cd-accent)] shadow-sm"
        />
        <button
          onClick={() => void handleSend()}
          disabled={!inputValue.trim() || sending}
          className="flex h-auto w-12 cursor-pointer items-center justify-center rounded-xl bg-[var(--cd-accent)] text-white transition-all hover:bg-[var(--cd-accent-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Send message"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
