"use client";

import { useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { type AppearancePatch, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "../../_components/use-apply-patch";
import { AiDock } from "./ai-dock";
import { AiPreview } from "./ai-preview";
import { mergePatch, overlayCurrent } from "./patch-merge";
import { useCurrentSettings } from "./use-current-settings";

export function AiCustomiser() {
  const backend = useBackend();
  const { apply, commit } = useApplyPatch();
  const readCurrent = useCurrentSettings();

  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  // The accumulated, previewed-but-unapplied changes. Each prompt refines
  // it; Apply commits it; Reset drops it.
  const [pending, setPending] = useState<AppearancePatch | null>(null);
  const [summary, setSummary] = useState("");

  async function onSend(text: string) {
    setNeedsAuth(false);
    setEmpty(false);
    setError("");
    setLoading(true);
    try {
      // Reason from what's on screen (base + pending) so refinements stack.
      const base = readCurrent();
      const current = pending ? overlayCurrent(base, pending) : base;
      const res = await backend.appearance.aiSuggest({ prompt: text, current });
      if (isEmptyPatch(res.patch)) {
        setEmpty(true);
        return;
      }
      setPending((prev) => (prev ? mergePatch(prev, res.patch) : res.patch));
      setSummary(res.summary);
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setNeedsAuth(true);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onApply() {
    if (!pending) return;
    apply(pending);
    commit();
    setPending(null);
    setSummary("");
  }

  function onReset() {
    setPending(null);
    setSummary("");
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-0 flex-col gap-3 lg:h-[calc(100dvh-12rem)] lg:gap-4">
      {/* Detached AI dock — its own bar above the preview. */}
      <div className="flex shrink-0 justify-center">
        <AiDock
          loading={loading}
          pending={pending !== null}
          needsAuth={needsAuth}
          empty={empty}
          error={error}
          summary={summary}
          onSend={onSend}
          onApply={onApply}
          onReset={onReset}
        />
      </div>

      {/* Native preview — the real typing surface, fills the rest. */}
      <div className="min-h-0 flex-1">
        <AiPreview patch={pending} />
      </div>
    </div>
  );
}
