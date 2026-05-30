"use client";

import { useRef, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import { type AiSuggestOutput, isEmptyPatch } from "@/types/appearance-ai";
import { useApplyPatch } from "../../_components/use-apply-patch";
import { AiChat, type ChatMessage } from "./ai-chat";
import { AiPreview } from "./ai-preview";

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: "Tell me how you want flinttype to look — colours, font, caret, the typing area. I'll show it on the surface to the right before anything is saved.",
};

export function AiCustomiser() {
  const backend = useBackend();
  const { apply, commit } = useApplyPatch();

  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [loading, setLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [suggestion, setSuggestion] = useState<AiSuggestOutput | null>(null);
  const idRef = useRef(1);

  const nextId = () => `m${idRef.current++}`;
  const push = (m: Omit<ChatMessage, "id">) =>
    setMessages((prev) => [...prev, { ...m, id: nextId() }]);

  async function onSend(text: string) {
    // Drop any live (un-accepted) suggestion before asking for the next.
    setSuggestion(null);
    setNeedsAuth(false);
    push({ role: "user", text });
    setLoading(true);
    try {
      const res = await backend.appearance.aiSuggest({ prompt: text });
      if (isEmptyPatch(res.patch)) {
        push({
          role: "assistant",
          text: "I couldn't map that to a setting. Try naming colours, a font, text size, the caret, or the typing area.",
        });
        return;
      }
      setSuggestion(res);
      push({ role: "assistant", text: res.summary, changes: res.changes });
    } catch (err) {
      if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
        setNeedsAuth(true);
        push({
          role: "assistant",
          text: "You'll need to sign in before I can suggest a look.",
        });
      } else {
        push({
          role: "assistant",
          text:
            err instanceof Error
              ? err.message
              : "Something went wrong. Try again.",
        });
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
    push({
      role: "assistant",
      text: "Saved. Keep going — describe another tweak, or head back to Settings.",
    });
  }

  function onReject() {
    setSuggestion(null);
    push({
      role: "assistant",
      text: "Dropped it. Your current look is unchanged — describe another one whenever you're ready.",
    });
  }

  return (
    <div className="flex h-[calc(100dvh-10rem)] min-h-0 flex-col gap-3 lg:h-[calc(100dvh-12.5rem)] lg:flex-row lg:gap-4">
      {/* Preview — top on mobile, right on desktop. */}
      <div className="order-1 flex h-[40vh] min-h-0 shrink-0 flex-col rounded-md border border-border bg-background lg:order-2 lg:h-full lg:flex-1">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live preview
          </span>
          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span
              aria-hidden
              className={
                "inline-block size-1.5 rounded-full " +
                (suggestion ? "bg-primary" : "bg-muted-foreground/40")
              }
            />
            {suggestion ? "Proposed look" : "Your current look"}
          </span>
        </header>
        <div className="min-h-0 flex-1 p-3">
          <AiPreview patch={suggestion?.patch ?? null} />
        </div>
      </div>

      {/* Chat — bottom on mobile, left on desktop. */}
      <div className="order-2 min-h-0 flex-1 lg:order-1 lg:h-full lg:w-[24rem] lg:flex-none">
        <AiChat
          messages={messages}
          loading={loading}
          pending={suggestion !== null}
          needsAuth={needsAuth}
          onSend={onSend}
          onAccept={onAccept}
          onReject={onReject}
        />
      </div>
    </div>
  );
}
