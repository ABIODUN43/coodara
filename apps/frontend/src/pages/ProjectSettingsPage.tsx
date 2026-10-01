import { useState, useEffect } from "react";
import {
  Sliders,
  Save,
  Check,
  DollarSign,
  Palette,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useProject } from "@/context/ProjectContext";
import { getOrganizationSettings, updateOrganizationSettings } from "@/api/settings";

export function ProjectSettingsPage() {
  const { activeProject } = useProject();
  const { theme, setTheme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Form states
  const [blockOnCircular, setBlockOnCircular] = useState(true);
  const [autoScanOnPush, setAutoScanOnPush] = useState(true);
  const [pricingProvider, setPricingProvider] = useState("aws");
  const [defaultRegion, setDefaultRegion] = useState("us-east-1");

  useEffect(() => {
    if (!activeProject?.id) return;
    let isCancelled = false;
    async function fetchSettings() {
      try {
        const data = await getOrganizationSettings(activeProject!.id);
        if (isCancelled) return;
        setBlockOnCircular(data.block_on_circular);
        setAutoScanOnPush(data.auto_scan_on_push);
      } catch (err) {
        console.error("Failed to load project settings:", err);
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
    setSavedMessage(null);
    try {
      await updateOrganizationSettings(activeProject.id, {
        block_on_circular: blockOnCircular,
        auto_scan_on_push: autoScanOnPush,
      });
      setSavedMessage("Settings saved successfully.");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-52px)] flex-col bg-[var(--cd-bg)] p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[var(--cd-ink)] sm:text-2xl">
              Project & Organization Settings
            </h1>
            <span className="rounded-full bg-[var(--cd-sunken)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--cd-ink-soft)] border border-[var(--cd-border)]">
              Policies & Economics
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-[var(--cd-ink-soft)] max-w-2xl">
            Configure organization-level architecture quality gates, automated scanning rules, and default Cloud Pricing sources for Architectural Economics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)] transition-colors shadow-xs disabled:opacity-50"
        >
          {savedMessage ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          <span>{saving ? "Saving..." : savedMessage || "Save Settings"}</span>
        </button>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Architecture Quality Gates */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cd-ink)]">
            <Sliders className="h-4 w-4 text-[var(--cd-accent)]" />
            <span>Architecture Governance & CI/CD Quality Gates</span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={blockOnCircular}
                onChange={(e) => setBlockOnCircular(e.target.checked)}
                className="mt-0.5 rounded border-[var(--cd-border)] text-[var(--cd-accent)] focus:ring-[var(--cd-accent)]"
              />
              <div>
                <span className="font-semibold text-[var(--cd-ink)] block">
                  Enforce Zero Circular Dependencies
                </span>
                <span className="text-[var(--cd-ink-soft)]">
                  Trigger quality gate violation if new Tarjan cycle components are introduced in pull requests.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScanOnPush}
                onChange={(e) => setAutoScanOnPush(e.target.checked)}
                className="mt-0.5 rounded border-[var(--cd-border)] text-[var(--cd-accent)] focus:ring-[var(--cd-accent)]"
              />
              <div>
                <span className="font-semibold text-[var(--cd-ink)] block">
                  Automatic Architecture Scan on Push
                </span>
                <span className="text-[var(--cd-ink-soft)]">
                  Queue background AST analysis whenever new commits land on the primary branch.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Economics Default Source */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cd-ink)]">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            <span>Default Cloud Pricing Catalog (Architectural Economics)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-medium text-[var(--cd-ink)] mb-1">
                Default Provider Rate Card
              </label>
              <select
                value={pricingProvider}
                onChange={(e) => setPricingProvider(e.target.value)}
                className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              >
                <option value="aws">Amazon Web Services (v2026.09)</option>
                <option value="gcp">Google Cloud Platform (v2026.09)</option>
                <option value="azure">Microsoft Azure (v2026.08)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-[var(--cd-ink)] mb-1">
                Default Reference Region
              </label>
              <select
                value={defaultRegion}
                onChange={(e) => setDefaultRegion(e.target.value)}
                className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] focus:outline-none focus:border-[var(--cd-accent)]"
              >
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--cd-ink)]">
            <Palette className="h-4 w-4 text-[var(--cd-accent)]" />
            <span>Appearance & Theme</span>
          </div>

          <div className="flex items-center gap-3">
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
              { id: "system", label: "System", icon: Laptop },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    theme === t.id
                      ? "border-[var(--cd-accent)] bg-[var(--cd-accent-soft)] text-[var(--cd-accent)] font-semibold"
                      : "border-[var(--cd-border)] bg-[var(--cd-bg)] text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
