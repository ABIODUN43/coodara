import { useState } from "react";
import {
  AlertTriangle,
  Cpu,
  Database,
  Plus,
  X,
} from "lucide-react";
import type {
  ResourceProfile,
  ResourceProfileCreateRequest,
  WorkloadProfile,
  WorkloadProfileCreateRequest,
} from "@/types/lab";
import { WorkloadMeasurementBadge } from "./LabBadges";

interface WorkloadResourceSectionProps {
  workloadProfiles: WorkloadProfile[];
  resourceProfiles: ResourceProfile[];
  onAddWorkloadProfile: (payload: WorkloadProfileCreateRequest) => Promise<WorkloadProfile>;
  onAddResourceProfile: (payload: ResourceProfileCreateRequest) => Promise<ResourceProfile>;
}

export function WorkloadResourceSection({
  workloadProfiles,
  resourceProfiles,
  onAddWorkloadProfile,
  onAddResourceProfile,
}: WorkloadResourceSectionProps) {
  const [showWorkloadModal, setShowWorkloadModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);

  // Workload Form
  const [wpName, setWpName] = useState("");
  const [wpDescription, setWpDescription] = useState("");
  const [wpRps, setWpRps] = useState<string>("500");
  const wpBatch = "10000";
  const [wpConcurrency, setWpConcurrency] = useState<string>("50");
  const wpRwRatio = "0.8";
  const wpDataGb = "50";
  const wpPattern = "steady";
  const [wpIsMeasured, setWpIsMeasured] = useState(false);

  // Resource Form
  const [rpName, setRpName] = useState("");
  const [rpDescription, setRpDescription] = useState("");
  const [rpProvider, setRpProvider] = useState("aws");
  const [rpRegion, setRpRegion] = useState("us-east-1");
  const [rpCpu, setRpCpu] = useState("4 vCPU");
  const [rpMemory, setRpMemory] = useState("16 GiB");
  const rpDbClass = "db.r6g.xlarge";
  const [rpReplicas, setRpReplicas] = useState<string>("3");
  const rpStorageGb = "100";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateWorkload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wpName.trim()) {
      setError("Please provide a workload profile name.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddWorkloadProfile({
        name: wpName.trim(),
        description: wpDescription.trim() || undefined,
        requests_per_second: wpRps ? parseFloat(wpRps) : undefined,
        batch_volume: wpBatch ? parseFloat(wpBatch) : undefined,
        concurrency: wpConcurrency ? parseInt(wpConcurrency, 10) : undefined,
        read_write_ratio: wpRwRatio ? parseFloat(wpRwRatio) : undefined,
        data_volume_gb: wpDataGb ? parseFloat(wpDataGb) : undefined,
        workload_pattern: wpPattern,
        is_measured: wpIsMeasured,
      });
      setShowWorkloadModal(false);
      setWpName("");
      setWpDescription("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create workload profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rpName.trim()) {
      setError("Please provide a resource profile name.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onAddResourceProfile({
        name: rpName.trim(),
        description: rpDescription.trim() || undefined,
        provider: rpProvider,
        region: rpRegion,
        cpu: rpCpu.trim() || undefined,
        memory: rpMemory.trim() || undefined,
        database_class: rpDbClass.trim() || undefined,
        replicas: rpReplicas ? parseInt(rpReplicas, 10) : 1,
        storage_gb: rpStorageGb ? parseFloat(rpStorageGb) : undefined,
      });
      setShowResourceModal(false);
      setRpName("");
      setRpDescription("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Failed to create resource profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Scope Notice */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-amber-800 dark:text-amber-200">
            Workload & Sizing Assumptions Discipline
          </span>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
            Values here serve as architectural boundary conditions and sizing parameters.
            Parameters marked as <span className="font-semibold font-mono">MODELED ASSUMPTION</span> are not claimed to be empirical production metrics unless verified with telemetry.
          </p>
        </div>
      </div>

      {/* SECTION 1: Workload Profiles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--cd-ink)] flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-500" />
              <span>Workload Profiles</span>
            </h3>
            <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
              Specify traffic rates, concurrency, read/write ratios, and volume characteristics.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowWorkloadModal(true);
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Define Workload</span>
          </button>
        </div>

        {workloadProfiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-6 text-center text-xs text-[var(--cd-ink-faint)] italic">
            No workload profiles defined. Create one to test how your architecture responds to peak, steady, or batch traffic.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {workloadProfiles.map((wp) => (
              <div
                key={wp.id}
                className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--cd-ink)]">{wp.name}</h4>
                    {wp.description && (
                      <p className="text-[11px] text-[var(--cd-ink-soft)] mt-0.5">{wp.description}</p>
                    )}
                  </div>
                  <WorkloadMeasurementBadge isMeasured={wp.is_measured} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs pt-2 border-t border-[var(--cd-border-soft)]">
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">RPS</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{wp.requests_per_second ?? "N/A"}</span>
                  </div>
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Concurrency</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{wp.concurrency ?? "N/A"}</span>
                  </div>
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Pattern</span>
                    <span className="font-semibold text-[var(--cd-ink)] capitalize">{wp.workload_pattern || "steady"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Resource Profiles */}
      <div className="space-y-4 pt-4 border-t border-[var(--cd-border-soft)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--cd-ink)] flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" />
              <span>Infrastructure Sizing Assumptions</span>
            </h3>
            <p className="text-xs text-[var(--cd-ink-soft)] mt-0.5">
              Hardware, database tier, and replica allocations used for architectural evaluation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowResourceModal(true);
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-[var(--cd-border)] bg-[var(--cd-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors shadow-2xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Define Sizing</span>
          </button>
        </div>

        {resourceProfiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--cd-border)] bg-[var(--cd-surface)]/50 p-6 text-center text-xs text-[var(--cd-ink-faint)] italic">
            No resource profiles defined. Add sizing assumptions to simulate cloud capacity requirements.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resourceProfiles.map((rp) => (
              <div
                key={rp.id}
                className="rounded-xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-5 space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--cd-ink)]">{rp.name}</h4>
                    <p className="text-[11px] text-[var(--cd-ink-soft)] font-mono mt-0.5">
                      {rp.provider.toUpperCase()} • {rp.region}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-500/10 px-2 py-0.5 text-[10px] font-mono text-[var(--cd-ink-soft)] border border-[var(--cd-border-soft)]">
                    RESOURCE ASSUMPTION
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pt-2 border-t border-[var(--cd-border-soft)]">
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Compute</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{rp.cpu || "N/A"}</span>
                  </div>
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Memory</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{rp.memory || "N/A"}</span>
                  </div>
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Replicas</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{rp.replicas}</span>
                  </div>
                  <div className="bg-[var(--cd-bg)] p-2 rounded-lg border border-[var(--cd-border-soft)]">
                    <span className="text-[10px] text-[var(--cd-ink-faint)] block">Storage</span>
                    <span className="font-semibold text-[var(--cd-ink)]">{rp.storage_gb ? `${rp.storage_gb} GB` : "N/A"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Define Workload Profile */}
      {showWorkloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowWorkloadModal(false)}
              className="cursor-pointer absolute top-4 right-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-[var(--cd-ink)] mb-1">
              Define Workload Profile
            </h3>
            <p className="text-xs text-[var(--cd-ink-soft)] mb-4">
              Enter workload parameters to simulate architecture performance under stress.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateWorkload} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--cd-ink)]">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={wpName}
                  onChange={(e) => setWpName(e.target.value)}
                  placeholder="e.g. Black Friday Peak Traffic"
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Requests / Second
                  </label>
                  <input
                    type="number"
                    value={wpRps}
                    onChange={(e) => setWpRps(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 font-mono text-xs text-[var(--cd-ink)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Concurrency
                  </label>
                  <input
                    type="number"
                    value={wpConcurrency}
                    onChange={(e) => setWpConcurrency(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 font-mono text-xs text-[var(--cd-ink)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="wp_is_measured"
                  checked={wpIsMeasured}
                  onChange={(e) => setWpIsMeasured(e.target.checked)}
                  className="rounded border-[var(--cd-border)] text-[var(--cd-accent)]"
                />
                <label htmlFor="wp_is_measured" className="text-xs text-[var(--cd-ink)] font-medium cursor-pointer">
                  Is this an empirically measured production metric? (Leave unchecked for modeled assumptions)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => setShowWorkloadModal(false)}
                  className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)]"
                >
                  <span>{isSubmitting ? "Saving..." : "Save Workload Profile"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Define Resource Profile */}
      {showResourceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-[var(--cd-border)] bg-[var(--cd-surface)] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setShowResourceModal(false)}
              className="cursor-pointer absolute top-4 right-4 rounded-lg p-1.5 text-[var(--cd-ink-faint)] hover:text-[var(--cd-ink)] hover:bg-[var(--cd-sunken)] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-base font-bold text-[var(--cd-ink)] mb-1">
              Define Resource Sizing Assumption
            </h3>
            <p className="text-xs text-[var(--cd-ink-soft)] mb-4">
              Enter target infrastructure sizing parameters for evaluation.
            </p>

            {error && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateResource} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--cd-ink)]">
                  Profile Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={rpName}
                  onChange={(e) => setRpName(e.target.value)}
                  placeholder="e.g. Standard Production Sizing"
                  className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Cloud Provider
                  </label>
                  <select
                    value={rpProvider}
                    onChange={(e) => setRpProvider(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)]"
                  >
                    <option value="aws">AWS</option>
                    <option value="gcp">Google Cloud</option>
                    <option value="azure">Azure</option>
                    <option value="on-prem">On-Premises</option>
                    <option value="generic">Generic / Multi-Cloud</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Region
                  </label>
                  <input
                    type="text"
                    value={rpRegion}
                    onChange={(e) => setRpRegion(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Compute
                  </label>
                  <input
                    type="text"
                    value={rpCpu}
                    onChange={(e) => setRpCpu(e.target.value)}
                    placeholder="4 vCPU"
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Memory
                  </label>
                  <input
                    type="text"
                    value={rpMemory}
                    onChange={(e) => setRpMemory(e.target.value)}
                    placeholder="16 GiB"
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--cd-ink)]">
                    Replicas
                  </label>
                  <input
                    type="number"
                    value={rpReplicas}
                    onChange={(e) => setRpReplicas(e.target.value)}
                    className="w-full rounded-lg border border-[var(--cd-border)] bg-[var(--cd-bg)] px-3 py-2 text-xs text-[var(--cd-ink)] font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--cd-border-soft)]">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="cursor-pointer rounded-lg px-4 py-2 text-xs font-medium text-[var(--cd-ink-soft)] hover:bg-[var(--cd-sunken)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg bg-[var(--cd-accent)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--cd-accent-hover)]"
                >
                  <span>{isSubmitting ? "Saving..." : "Save Resource Sizing"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
