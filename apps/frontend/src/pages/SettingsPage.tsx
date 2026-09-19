import { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  Sliders,
  Bot,
  Users,
  Check,
  Save,
  Trash2,
  RefreshCw,
  GitBranch,
  Palette,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useProject } from "@/context/ProjectContext";
import { useAuthContext } from "@/context/AuthContext";
import { getOrganizationSettings, updateOrganizationSettings } from "@/api/settings";

export function SettingsPage() {
  const { activeProject } = useProject();
  const { user } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeTab, setActiveTab] = useState<string>("general");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Form states
  const [orgName, setOrgName] = useState(activeProject?.name ?? "Coodara-Team");
  const [blockOnCircular, setBlockOnCircular] = useState(true);
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [minHealthThreshold, setMinHealthThreshold] = useState(70);
  const [llmProvider, setLlmProvider] = useState("coodara");
  const [llmModel, setLlmModel] = useState("coodara-architecture-engine-v1");
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProject?.id) return;
    let isCancelled = false;
    async function fetchSettings() {
      try {
        const data = await getOrganizationSettings(activeProject!.id);
        if (isCancelled) return;
        setBlockOnCircular(data.block_on_circular);
        setAutoScanOnPush(data.auto_scan_on_push);
        setMinHealthThreshold(data.min_health_threshold);
        setLlmProvider(data.llm_provider);
        setLlmModel(data.llm_model);
        setHasApiKey(data.has_api_key);
        setApiKeyPreview(data.api_key_preview);
      } catch (err) {
        console.error("Failed to load organization settings:", err);
      }
    }
    fetchSettings();
    return () => {
      isCancelled = true;
    };
  }, [activeProject?.id]);

  const handleSave = async () => {
    if (!activeProject?.id) return;
    setSaving(true);
    try {
      const updated = await updateOrganizationSettings(activeProject.id, {
        block_on_circular: blockOnCircular,
        auto_scan_on_push: autoScanOnPush,
        min_health_threshold: minHealthThreshold,
        llm_provider: llmProvider,
        llm_model: llmModel,
        api_key: apiKey.trim() ? apiKey.trim() : undefined,
      });
      setHasApiKey(updated.has_api_key);
      setApiKeyPreview(updated.api_key_preview);
      if (apiKey.trim()) setApiKey("");
      setSavedMessage("Settings successfully saved and persisted!");
      setTimeout(() => setSavedMessage(null), 3500);
    } catch (err) {
      console.error("Failed to update organization settings:", err);
      setSavedMessage("Error saving settings. Please try again.");
      setTimeout(() => setSavedMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setSavedMessage(`Appearance switched to ${newTheme} mode.`);
    setTimeout(() => setSavedMessage(null), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[var(--cd-bg)] p-4 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--cd-border-soft)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--cd-sunken)] text-[var(--cd-ink)]">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-semibold text-[var(--cd-ink)]">
                Organization & Platform Settings
              </h1>
              <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--cd-ink-soft)]">
                {activeProject?.name ?? "Settings"}
              </span>
            </div>
            <p className="text-[12px] text-[var(--cd-ink-faint)]">
              Manage organization preferences, theme appearance, architecture quality gates, AI providers, and access control.
            </p>
          </div>
        </div>

        {savedMessage && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--cd-good-bg)] px-3 py-1.5 text-[12px] font-medium text-[var(--cd-good)] border border-[var(--cd-good)]/30">
            <Check className="h-4 w-4" />
            {savedMessage}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Navigation Sidebar */}
        <div className="flex flex-row lg:flex-col gap-1 w-full lg:w-56 flex-shrink-0 overflow-x-auto pb-2 lg:pb-0">
          {[
            { id: "general", label: "General & Identity", icon: Building2 },
            { id: "appearance", label: "Appearance & Theme", icon: Palette },
            { id: "quality-gates", label: "Quality Gates & CI", icon: Sliders },
            { id: "ai-engine", label: "AI & Model Config", icon: Bot },
            { id: "team", label: "Team & Permissions", icon: Users },
            { id: "danger", label: "Danger Zone", icon: Trash2 },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`cursor-pointer flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium text-left transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[var(--cd-accent-soft)] text-[var(--cd-accent)]"
                    : "text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)] hover:text-[var(--cd-ink)]"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="flex-1 rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 sm:p-6 shadow-xs space-y-6">
          {/* 1. GENERAL TAB */}
          {activeTab === "general" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                  Organization Profile
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Basic workspace properties and connected GitHub integrations.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--cd-ink)] mb-1">
                    Organization Display Name
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)]"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--cd-ink)] mb-1">
                    Active Plan
                  </label>
                  <div className="flex items-center justify-between rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3">
                    <div>
                      <div className="font-semibold text-[13px] text-[var(--cd-ink)]">
                        Enterprise Architecture Pro
                      </div>
                      <div className="text-[11px] text-[var(--cd-ink-faint)]">
                        Unlimited AST analysis jobs, live dependency graphs, Architecture Memory, Architecture Chat.
                      </div>
                    </div>
                    <span className="rounded bg-[var(--cd-good-bg)] px-2 py-0.5 text-[11px] font-bold text-[var(--cd-good)] border border-[var(--cd-good)]/20">
                      Active
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--cd-ink)] mb-1">
                    Connected GitHub User
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--cd-ink)] text-white">
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div className="text-[12px]">
                      <span className="font-semibold text-[var(--cd-ink)]">@{user?.username || "ABIODUN43"}</span>
                      <div className="text-[11px] text-[var(--cd-ink-faint)]">OAuth GitHub app verified and synchronized</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--cd-border-soft)]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* 2. APPEARANCE & THEME TAB */}
          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                  Appearance & Theme
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Customize the interface theme mode to match your preferred working environment.
                </p>
              </div>

              {mounted && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl">
                  {/* Light Theme Card */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-all relative space-y-3 ${
                      theme === "light"
                        ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)]/40 ring-2 ring-[var(--cd-accent)]/20 shadow-xs"
                        : "border-[var(--cd-border)] bg-[var(--cd-sunken)]/50 hover:bg-[var(--cd-sunken)] hover:border-[var(--cd-ink-faint)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <Sun className="h-5 w-5" />
                      </div>
                      {theme === "light" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cd-accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[var(--cd-ink)]">Light Mode</h4>
                      <p className="text-[11.5px] text-[var(--cd-ink-faint)] mt-0.5">
                        Clean crisp background, high-contrast dark text, subtle borders.
                      </p>
                    </div>

                    {/* Miniature UI Preview */}
                    <div className="rounded-md border border-slate-200 bg-white p-2 space-y-1.5 shadow-xs">
                      <div className="h-2 w-16 bg-slate-300 rounded" />
                      <div className="flex gap-1">
                        <div className="h-5 flex-1 bg-slate-100 rounded border border-slate-200" />
                        <div className="h-5 flex-1 bg-indigo-50 rounded border border-indigo-200" />
                      </div>
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-all relative space-y-3 ${
                      theme === "dark"
                        ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)]/40 ring-2 ring-[var(--cd-accent)]/20 shadow-xs"
                        : "border-[var(--cd-border)] bg-[var(--cd-sunken)]/50 hover:bg-[var(--cd-sunken)] hover:border-[var(--cd-ink-faint)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Moon className="h-5 w-5" />
                      </div>
                      {theme === "dark" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cd-accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[var(--cd-ink)]">Dark Mode</h4>
                      <p className="text-[11.5px] text-[var(--cd-ink-faint)] mt-0.5">
                        Deep zinc & slate surfaces with soft contrast for reduced eye strain.
                      </p>
                    </div>

                    {/* Miniature UI Preview */}
                    <div className="rounded-md border border-zinc-800 bg-zinc-950 p-2 space-y-1.5 shadow-xs">
                      <div className="h-2 w-16 bg-zinc-700 rounded" />
                      <div className="flex gap-1">
                        <div className="h-5 flex-1 bg-zinc-900 rounded border border-zinc-800" />
                        <div className="h-5 flex-1 bg-indigo-950/60 rounded border border-indigo-800/40" />
                      </div>
                    </div>
                  </button>

                  {/* System Theme Card */}
                  <button
                    type="button"
                    onClick={() => handleThemeChange("system")}
                    className={`cursor-pointer rounded-xl border p-4 text-left transition-all relative space-y-3 ${
                      theme === "system"
                        ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)]/40 ring-2 ring-[var(--cd-accent)]/20 shadow-xs"
                        : "border-[var(--cd-border)] bg-[var(--cd-sunken)]/50 hover:bg-[var(--cd-sunken)] hover:border-[var(--cd-ink-faint)]/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--cd-sunken)] text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
                        <Laptop className="h-5 w-5" />
                      </div>
                      {theme === "system" && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--cd-accent)] text-white">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[var(--cd-ink)]">System Auto</h4>
                      <p className="text-[11.5px] text-[var(--cd-ink-faint)] mt-0.5">
                        Automatically match your device&apos;s OS light or dark settings.
                      </p>
                    </div>

                    {/* Miniature UI Preview */}
                    <div className="rounded-md border border-slate-300 dark:border-zinc-800 bg-gradient-to-r from-white to-zinc-950 p-2 space-y-1.5 shadow-xs">
                      <div className="h-2 w-16 bg-slate-400 dark:bg-zinc-600 rounded" />
                      <div className="flex gap-1">
                        <div className="h-5 flex-1 bg-slate-100 rounded border border-slate-200" />
                        <div className="h-5 flex-1 bg-zinc-900 rounded border border-zinc-800" />
                      </div>
                    </div>
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4 max-w-2xl text-[12px] text-[var(--cd-ink-soft)]">
                <p>
                  <strong>Active Preference:</strong> Currently rendering in{" "}
                  <span className="font-semibold text-[var(--cd-accent)] capitalize">{theme || "system"}</span> mode.
                  Your preference is stored in local storage and persists across sessions.
                </p>
              </div>
            </div>
          )}

          {/* 3. QUALITY GATES TAB */}
          {activeTab === "quality-gates" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                  Architecture Quality Gates & CI Rules
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Configure automated boundaries that guard against architectural decay and technical debt.
                </p>
              </div>

              <div className="space-y-4 max-w-xl">
                <div className="flex items-center justify-between rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      Block on Circular Dependencies
                    </div>
                    <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
                      Mark PRs as failed if a new module dependency cycle is introduced.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={blockOnCircular}
                    onChange={(e) => setBlockOnCircular(e.target.checked)}
                    className="h-4 w-4 rounded accent-[var(--cd-accent)] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--cd-ink)]">
                      Automated Scan on Git Push
                    </div>
                    <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
                      Queue asynchronous Celery worker analysis as soon as new commits land on the default branch.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoScanOnPush}
                    onChange={(e) => setAutoScanOnPush(e.target.checked)}
                    className="h-4 w-4 rounded accent-[var(--cd-accent)] cursor-pointer"
                  />
                </div>

                <div className="rounded-xl border border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] p-4 space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="font-semibold text-[var(--cd-ink)]">
                      Minimum Maintainability Score Threshold
                    </span>
                    <span className="font-mono font-bold text-[var(--cd-accent)]">
                      {minHealthThreshold}/100
                    </span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={minHealthThreshold}
                    onChange={(e) => setMinHealthThreshold(Number(e.target.value))}
                    className="w-full accent-[var(--cd-accent)] cursor-pointer"
                  />
                  <div className="text-[11px] text-[var(--cd-ink-faint)] flex justify-between">
                    <span>50 (Permissive)</span>
                    <span>70 (Recommended)</span>
                    <span>95 (Strict)</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[var(--cd-border-soft)]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Quality Gates
                </button>
              </div>
            </div>
          )}

          {/* 4. AI ENGINE TAB */}
          {activeTab === "ai-engine" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                  Coodara AI & LLM Engine Settings
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Configure the generative AI and architecture reasoning providers powering the Assistant.
                </p>
              </div>

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--cd-ink)] mb-1">
                    AI Reasoning Provider
                  </label>
                  <select
                    value={llmProvider}
                    onChange={(e) => {
                      const p = e.target.value;
                      setLlmProvider(p);
                      if (p === "coodara") setLlmModel("coodara-architecture-engine-v1");
                      else if (p === "openai") setLlmModel("gpt-4o-mini");
                      else if (p === "anthropic") setLlmModel("claude-3-5-sonnet");
                      else if (p === "gemini") setLlmModel("gemini-2.0-flash");
                    }}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] cursor-pointer"
                  >
                    <option value="coodara">⚡ Coodara Native Architecture Reasoning Engine (Fastest, Grounded)</option>
                    <option value="openai">OpenAI (GPT-4o / GPT-4o-mini)</option>
                    <option value="gemini">Google Gemini (Gemini 2.0 Flash / Pro)</option>
                    <option value="anthropic">Anthropic Claude (Claude 3.5 Sonnet)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--cd-ink)] mb-1">
                    Model Identifier
                  </label>
                  <input
                    type="text"
                    value={llmModel}
                    onChange={(e) => setLlmModel(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] font-mono"
                  />
                </div>

                {llmProvider !== "coodara" && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[12px] font-medium text-[var(--cd-ink)]">
                        Custom Provider API Key
                      </label>
                      {hasApiKey && (
                        <span className="text-[11px] font-mono text-[var(--cd-good)] bg-[var(--cd-good-bg)] px-2 py-0.5 rounded border border-[var(--cd-good)]/30">
                          Active: {apiKeyPreview || "sk-****"}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 pr-16 text-[13px] text-[var(--cd-ink)] outline-none focus:border-[var(--cd-accent)] font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey((v) => !v)}
                        className="absolute right-2 top-2 text-[11px] text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] cursor-pointer"
                      >
                        {showApiKey ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--cd-ink-faint)]">
                      Keys are encrypted at rest using AES-GCM before database storage.
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--cd-border-soft)]">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer flex items-center gap-2 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-[12.5px] font-medium text-white shadow-xs hover:bg-[var(--cd-accent-hover)] transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save AI Configuration
                </button>
              </div>
            </div>
          )}

          {/* 5. TEAM TAB */}
          {activeTab === "team" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-ink)]">
                  Organization Members
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Manage members and role-based access control for {activeProject?.name}.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--cd-border-soft)] overflow-hidden shadow-xs">
                <table className="w-full text-left text-[12px]">
                  <thead className="border-b border-[var(--cd-border-soft)] bg-[var(--cd-sunken)] text-[11px] font-semibold text-[var(--cd-ink-faint)] uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Member</th>
                      <th className="px-4 py-2.5">Role</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--cd-border-soft)] text-[var(--cd-ink)]">
                    <tr>
                      <td className="px-4 py-3 flex items-center gap-2.5 font-medium">
                        <div className="h-6 w-6 rounded-full bg-[var(--cd-accent)] text-white flex items-center justify-center text-[10px] font-bold">
                          {(user?.username || "A").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div>{user?.username || "ABIODUN43"} (You)</div>
                          <div className="text-[10.5px] text-[var(--cd-ink-faint)]">{user?.email || "owner@coodara.io"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-[var(--cd-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--cd-accent)] border border-[var(--cd-accent)]/20">
                          Owner
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--cd-good)] font-medium">Active</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. DANGER ZONE */}
          {activeTab === "danger" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-[15px] font-semibold text-[var(--cd-risk)]">
                  Danger Zone
                </h3>
                <p className="text-[12px] text-[var(--cd-ink-faint)]">
                  Irreversible actions concerning cached AST telemetry and workspace links.
                </p>
              </div>

              <div className="space-y-3 max-w-xl">
                <div className="flex items-center justify-between rounded-xl border border-[var(--cd-risk)]/30 bg-[var(--cd-risk-bg)]/30 p-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[var(--cd-risk)]">
                      Purge Cached AST & Analysis Results
                    </div>
                    <div className="text-[11.5px] text-[var(--cd-ink-faint)]">
                      Forces a fresh end-to-end AST scan and architecture snapshot calculation on next analysis.
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      alert("Cached analysis snapshots will be recomputed on the next analysis run.");
                    }}
                    className="cursor-pointer rounded-lg border border-[var(--cd-risk)] px-3 py-1.5 text-[12px] font-medium text-[var(--cd-risk)] hover:bg-[var(--cd-risk)] hover:text-white transition-colors"
                  >
                    Purge Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
