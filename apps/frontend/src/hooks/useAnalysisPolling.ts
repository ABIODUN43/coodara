import { useEffect, useRef, useState } from "react";
import { getAnalysis } from "@/api/analyses";
import type { Analysis } from "@/types/analysis";

const ACTIVE_STATUSES = new Set(["pending", "queued", "running"]);
const MAX_POLL_MS = 30 * 60 * 1000; // 30 minutes

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
    let timerId: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      const elapsed = Date.now() - startRef.current;
      if (elapsed > MAX_POLL_MS) {
        console.warn("Analysis polling reached max duration limit");
        return;
      }
      const pollDelay = elapsed < 30000 ? 1500 : 3000;

      try {
        const updated = await getAnalysis(orgId, repoId, analysis!.id);
        if (cancelled) return;
        setCurrent(updated);
        if (ACTIVE_STATUSES.has(updated.status)) {
          timerId = setTimeout(poll, pollDelay);
        } else {
          onSettled(updated);
        }
      } catch {
        if (!cancelled) {
          timerId = setTimeout(poll, pollDelay);
        }
      }
    }

    // Immediate initial poll followed by 1s intervals
    poll();

    return () => {
      cancelled = true;
      if (timerId) clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.id, analysis?.status]);

  return current;
}