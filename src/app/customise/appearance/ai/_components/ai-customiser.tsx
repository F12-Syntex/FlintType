"use client";

import { useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { type AiSuggestOutput, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "../../_components/use-apply-patch";
import { AiDock } from "./ai-dock";
import { AiPreview } from "./ai-preview";
import { useCurrentSettings } from "./use-current-settings";

export function AiCustomiser() {
  const backend = useBackend();
  const { apply, commit } = useApplyPatch();
  const readCurrent = useCurrentSettings();

  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState<AiSuggestOutput | null>(null);

  async function onSend(text: string) {
    setSuggestion(null);
    setNeedsAuth(false);
    setEmpty(false);
    setError("");
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({
        prompt: text,
        current: readCurrent(),
      });
      if (isEmptyPatch(res.patch)) {
        setEmpty(true);
        return;
      }
      setSuggestion(res);
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

  function onAccept() {
    if (!suggestion) return;
    apply(suggestion.patch);
    commit();
    setSuggestion(null);
  }

  function onReject() {
    setSuggestion(null);
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-0 flex-col gap-3 lg:h-[calc(100dvh-12rem)] lg:gap-4">
      {/* Detached AI dock — its own bar above the preview. */}
      <div className="flex shrink-0 justify-center">
        <AiDock
          loading={loading}
          pending={suggestion !== null}
          needsAuth={needsAuth}
          empty={empty}
          error={error}
          summary={suggestion?.summary ?? ""}
          onSend={onSend}
          onAccept={onAccept}
          onReject={onReject}
        />
      </div>

      {/* Native preview — the real typing surface, fills the rest. */}
      <div className="min-h-0 flex-1">
        <AiPreview patch={suggestion?.patch ?? null} />
      </div>
    </div>
  );
}
