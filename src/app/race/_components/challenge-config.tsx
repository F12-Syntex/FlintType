"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBackend } from "@/lib/backend";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import type { RaceModeId } from "./race-data";

const WORD_COUNTS = [10, 25, 50, 100] as const;
const DURATIONS = [15, 30, 60] as const;
type WordList = "english" | "common";

/** Create-a-lobby control with host settings. Opens a small panel
 *  (popover on desktop, bottom sheet on mobile per ui-law §10.5) where
 *  the host picks the word list, a word-count or timed race, and the
 *  length — then creates the challenge and navigates to the lobby.
 *  The mode (incl. Free-for-all) is chosen in the mode picker; this
 *  panel configures the passage. */
export function CreateChallengePanel({ modeId }: { modeId: RaceModeId }) {
  const isMobile = useIsMobile();
  const backend = useBackend();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [timed, setTimed] = useState(false);
  const [wordCount, setWordCount] = useState<number>(25);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [wordList, setWordList] = useState<WordList>("english");
  const [pending, setPending] = useState(false);

  async function create() {
    if (pending) return;
    setPending(true);
    try {
      const res = await backend.race.challenge.create({
        modeId,
        wordList,
        ...(timed ? { durationSec } : { wordCount }),
      });
      writeHostStorage(res.slug, {
        roomId: res.roomId,
        sessionToken: res.sessionToken,
        words: res.words,
        totalChars: res.totalChars,
        modeId: res.modeId as Parameters<typeof writeHostStorage>[1]["modeId"],
        roundNumber: 1,
      });
      router.push(`/race/c/${res.slug}`);
    } catch {
      setPending(false);
    }
  }

  const body = (
    <div className="flex flex-col gap-4 p-1">
      <Row label="Word list">
        <Chip active={wordList === "english"} onClick={() => setWordList("english")}>
          English
        </Chip>
        <Chip active={wordList === "common"} onClick={() => setWordList("common")}>
          Common
        </Chip>
      </Row>
      <Row label="Race type">
        <Chip active={!timed} onClick={() => setTimed(false)}>
          Words
        </Chip>
        <Chip active={timed} onClick={() => setTimed(true)}>
          Timed
        </Chip>
      </Row>
      <Row label={timed ? "Seconds" : "Words"}>
        {timed
          ? DURATIONS.map((d) => (
              <Chip key={d} active={durationSec === d} onClick={() => setDurationSec(d)}>
                {d}s
              </Chip>
            ))
          : WORD_COUNTS.map((w) => (
              <Chip key={w} active={wordCount === w} onClick={() => setWordCount(w)}>
                {w}
              </Chip>
            ))}
      </Row>
      <button
        type="button"
        onClick={create}
        disabled={pending}
        className={cn(
          "mt-1 inline-flex h-9 items-center justify-center rounded-md bg-primary px-3.5",
          "text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground",
          "transition-[background-color,transform] duration-150 hover:bg-primary/90 active:translate-y-[0.5px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          pending && "cursor-wait opacity-60",
        )}
      >
        {pending ? "Creating…" : "Create & invite"}
      </button>
    </div>
  );

  const trigger = (
    <button
      type="button"
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3",
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
        "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      )}
    >
      Create lobby
    </button>
  );

  if (isMobile) {
    return (
      <>
        <span onClick={() => setOpen(true)} className="contents">
          {trigger}
        </span>
        <MobileSheet open={open} onOpenChange={setOpen} title="Create a lobby">
          {body}
        </MobileSheet>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-64">
        {body}
      </PopoverContent>
    </Popover>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center rounded-md border px-2.5",
        "text-[11px] font-semibold uppercase tracking-[0.12em] tabular-nums",
        "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-accent/40",
      )}
    >
      {children}
    </button>
  );
}
