"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  TypingSurface,
  type TypingProgress,
  type TypingResult,
} from "@/components/typing-surface";
import { useBackend } from "@/lib/backend";
import { generateRandomWords } from "@/lib/random-words";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import { cn } from "@/lib/utils";

const POST_THROTTLE_MS = 700;
const WORD_COUNT = 30;
/** Module-level stable default — useRemotePrefs captures it once. */
const SPECTATE_DEFAULT = { enabled: false };

/** /live — a self-contained practice surface that streams the user's
 *  progress (~every 700ms) so mutual friends can watch at
 *  /live/<userId>. Streaming only happens while the `spectatable`
 *  consent toggle is on; the server enforces the same gate. */
export function LiveBroadcastView() {
  const backend = useBackend();
  const { isLoaded, isSignedIn } = useUser();
  const { value: spectate, update: setSpectate } = useRemotePrefs<{
    enabled: boolean;
  }>("spectate", SPECTATE_DEFAULT);
  const spectatable = spectate.enabled;
  const [words, setWords] = useState(() => generateRandomWords(WORD_COUNT));

  const lastPost = useRef(0);
  const wordsRef = useRef(words);
  wordsRef.current = words;
  const spectatableRef = useRef(spectatable);
  spectatableRef.current = spectatable;

  const onProgress = useCallback(
    (p: TypingProgress) => {
      if (!spectatableRef.current) return;
      const now = Date.now();
      if (now - lastPost.current < POST_THROTTLE_MS) return;
      lastPost.current = now;
      backend.live
        .progress({
          words: wordsRef.current,
          progressChars: p.progressChars,
          totalChars: p.totalChars,
          wpm: p.wpm,
          accuracy: p.accuracy,
        })
        .catch(() => {});
    },
    [backend],
  );

  const onFinish = useCallback((_r: TypingResult) => {
    setWords(generateRandomWords(WORD_COUNT));
  }, []);

  // Stop broadcasting when the user leaves the surface.
  useEffect(() => {
    if (!isSignedIn) return;
    return () => {
      backend.live.stop().catch(() => {});
    };
  }, [backend, isSignedIn]);

  if (isLoaded && !isSignedIn) {
    return (
      <Shell>
        <p className="rounded-md border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          Sign in to practise live.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="flex flex-col gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Live practice
        </span>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Type, and let your friends watch
        </h1>
      </header>

      <button
        type="button"
        onClick={() => setSpectate({ enabled: !spectatable })}
        aria-pressed={spectatable}
        className={cn(
          "flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
          spectatable
            ? "border-border bg-foreground text-background"
            : "border-border bg-card text-foreground hover:bg-accent",
        )}
      >
        <span className="flex flex-col gap-0.5">
          <span className="text-[12px] font-semibold">
            {spectatable ? "Friends can watch you" : "Sharing is off"}
          </span>
          <span
            className={cn(
              "text-[11px]",
              spectatable ? "text-background/70" : "text-muted-foreground",
            )}
          >
            {spectatable
              ? "Mutual friends can spectate this session live."
              : "Turn on to let mutual friends watch you type."}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
            spectatable
              ? "bg-background/20 text-background"
              : "bg-muted text-muted-foreground",
          )}
        >
          {spectatable ? "On" : "Off"}
        </span>
      </button>

      <TypingSurface
        key={words.join(" ")}
        words={words}
        onFinish={onFinish}
        onProgress={onProgress}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-1 py-8 sm:py-12">
      {children}
    </main>
  );
}
