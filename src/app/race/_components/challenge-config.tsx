"use client";

import { ChevronDown } from "lucide-react";
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
import { fetchWordlist } from "@/lib/wordlists/fetch";
import {
  DEFAULT_WORDLIST,
  wordlistLabel,
  type WordlistId,
} from "@/lib/wordlists/use-wordlist";
import { RACE_WORD_POOL_MAX } from "@/types/race";
import { WordlistPicker } from "../../_components/wordlist-picker";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import type { RaceModeId } from "./race-data";

const WORD_COUNTS = [10, 25, 50, 100] as const;
const DURATIONS = [15, 30, 60] as const;

/** Create-a-lobby control with host settings. Opens a small panel
 *  (popover on desktop, bottom sheet on mobile per ui-law §10.5) where
 *  the host picks the wordlist (the SAME searchable MonkeyType catalog
 *  single-player practice uses), a word-count or timed race, and the
 *  length — then creates the challenge and navigates to the lobby. The
 *  chosen wordlist is fetched client-side and a capped word pool is
 *  sent to the server, which generates + re-rolls the passage from it.
 *  The mode (incl. Free-for-all) is chosen in the mode picker. */
export function CreateChallengePanel({ modeId }: { modeId: RaceModeId }) {
  const isMobile = useIsMobile();
  const backend = useBackend();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [timed, setTimed] = useState(false);
  const [wordCount, setWordCount] = useState<number>(25);
  const [durationSec, setDurationSec] = useState<number>(30);
  const [wordlistId, setWordlistId] = useState<WordlistId>(DEFAULT_WORDLIST);
  const [pending, setPending] = useState(false);

  async function create() {
    if (pending) return;
    setPending(true);
    try {
      // Fetch the chosen list (cached after first use, same path as the
      // practice picker) and cap it to a sane pool the server samples
      // from. A fetch failure falls back to the server's English pool.
      let wordPool: string[] | undefined;
      try {
        const file = await fetchWordlist(wordlistId);
        const pool = file.words.filter((w) => w.length <= 60).slice(0, RACE_WORD_POOL_MAX);
        if (pool.length > 0) wordPool = pool;
      } catch {
        wordPool = undefined;
      }
      const res = await backend.race.challenge.create({
        modeId,
        wordListId: wordlistId,
        ...(wordPool ? { wordPool } : {}),
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
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className={cn(
            "inline-flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3",
            "text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground",
            "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent/40",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          )}
        >
          <span className="truncate">{wordlistLabel(wordlistId)}</span>
          <ChevronDown size={12} className="shrink-0 text-muted-foreground" aria-hidden />
        </button>
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

  // The wordlist picker (a modal Dialog) is shared by both the desktop
  // popover and the mobile sheet. Rendered once here so opening it from
  // either surface works identically.
  const picker = (
    <WordlistPicker
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      value={wordlistId}
      onPick={(id) => {
        setWordlistId(id);
        setPickerOpen(false);
      }}
    />
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
        {picker}
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-64"
          // Keep the panel open while the wordlist dialog is up — the
          // dialog portals outside the popover, so without this its
          // overlay click would dismiss the panel underneath.
          onInteractOutside={(e) => {
            if (pickerOpen) e.preventDefault();
          }}
          onFocusOutside={(e) => {
            if (pickerOpen) e.preventDefault();
          }}
        >
          {body}
        </PopoverContent>
      </Popover>
      {picker}
    </>
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
