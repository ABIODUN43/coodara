import { useEffect, useRef, useState } from "react";
import { getAnalysis } from "@/api/analyses";
import type { Analysis } from "@/types/analysis";

const ACTIVE_STATUSES = new Set(["pending", "queued", "running"]);
const MAX_POLL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 2500;

export function useAnalysisPolling(
  orgId: string,
  repoId: string,
  analysis: Analysis | null,
  onSettled: (a: Analysis) => void
) {
  const [current, setCurrent] = useState<Analysis | null>(analysis);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    setCurrent(analysis);
    if (!analysis || !ACTIVE_STATUSES.has(analysis.status)) return;

    startRef.current = Date.now();
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      if (Date.now() - startRef.current > MAX_POLL_MS) return;
      try {
        const updated = await getAnalysis(orgId, repoId, analysis!.id);
        if (cancelled) return;
        setCurrent(updated);
        if (ACTIVE_STATUSES.has(updated.status)) {
          setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          onSettled(updated);
        }
      } catch {
        if (!cancelled) setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    const t = setTimeout(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id, analysis?.status]);

  return current;
}