"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
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
import {
  DEFAULT_RACE_QUOTE_LENGTHS,
  RACE_QUOTE_GROUPS,
  RACE_WORD_POOL_MAX,
} from "@/types/race";
import { WordlistPicker } from "../../_components/wordlist-picker";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import type { RaceModeId } from "./race-data";

const WORD_COUNTS = [10, 25, 50, 100] as const;
const DURATIONS = [15, 30, 60] as const;

type LobbyType = "quote" | "words" | "timed";

/** Persisted lobby-creation config. Pressing "Create lobby" fires
 *  instantly with whatever's saved here; the gear opens the editor. */
type LobbyConfig = {
  type: LobbyType;
  /** Quote length buckets (ids into RACE_QUOTE_GROUPS) for a quote race. */
  quoteLengths: number[];
  wordCount: number;
  durationSec: number;
  wordlistId: WordlistId;
};

const STORAGE_KEY = "ft:race:lobby-config";

/** A fresh lobby is a small-to-large quote race (short..long). */
const DEFAULT_CONFIG: LobbyConfig = {
  type: "quote",
  quoteLengths: [...DEFAULT_RACE_QUOTE_LENGTHS],
  wordCount: 25,
  durationSec: 30,
  wordlistId: DEFAULT_WORDLIST,
};

/** Read the saved config, coercing anything unexpected back to the
 *  default so a hand-edited / stale localStorage value can't wedge the
 *  control. Returns the default on the server (no localStorage). */
function loadConfig(): LobbyConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const p = JSON.parse(raw) as Partial<LobbyConfig>;
    const lengths = Array.isArray(p.quoteLengths)
      ? p.quoteLengths.filter((n) => Number.isInteger(n) && n >= 0 && n <= 3)
      : [];
    return {
      type: p.type === "words" || p.type === "timed" ? p.type : "quote",
      quoteLengths: lengths.length
        ? lengths
        : [...DEFAULT_RACE_QUOTE_LENGTHS],
      wordCount: (WORD_COUNTS as readonly number[]).includes(p.wordCount as number)
        ? (p.wordCount as number)
        : 25,
      durationSec: (DURATIONS as readonly number[]).includes(p.durationSec as number)
        ? (p.durationSec as number)
        : 30,
      wordlistId: (p.wordlistId as WordlistId) ?? DEFAULT_WORDLIST,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Create-a-lobby control. The primary "Create lobby" button creates a
 *  private lobby IMMEDIATELY (no config step) and navigates to it; the
 *  gear beside it opens a settings editor (popover on desktop, bottom
 *  sheet on mobile per ui-law §10.5) for the lobby's passage. The
 *  config is saved per browser, so the next instant-create reuses it.
 *  A fresh lobby defaults to a small-to-large quote race.
 *
 *  Quote races draw a curated quote whose length sits in the chosen
 *  range, server-side. Word / timed races fetch the chosen MonkeyType
 *  wordlist client-side and send a capped pool the server generates the
 *  passage from. The mode (1v1 / Free-for-all) is the mode picker's. */
export function CreateChallengePanel({ modeId }: { modeId: RaceModeId }) {
  const isMobile = useIsMobile();
  const backend = useBackend();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Hydrate config from localStorage after mount so the server-rendered
  // markup (always the default) matches the first client render, then
  // swap in the saved value. Persist on every later change.
  const [config, setConfig] = useState<LobbyConfig>(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setConfig(loadConfig());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Private mode / blocked storage — the config just won't persist
      // across reloads. Creation still works from in-memory state.
    }
  }, [config, hydrated]);

  function toggleLength(id: number) {
    setConfig((c) => {
      const next = c.quoteLengths.includes(id)
        ? c.quoteLengths.filter((n) => n !== id)
        : [...c.quoteLengths, id];
      // Never let the host clear every bucket — a quote race always
      // needs at least one length to draw from (server requires min 1).
      if (next.length === 0) return c;
      return { ...c, quoteLengths: next.sort((a, b) => a - b) };
    });
  }

  async function create() {
    if (pending) return;
    setPending(true);
    try {
      let res;
      if (config.type === "quote") {
        res = await backend.race.challenge.create({
          modeId,
          quote: true,
          quoteLengths: config.quoteLengths,
        });
      } else {
        // Fetch the chosen list (cached after first use, same path as the
        // practice picker) and cap it to a sane pool the server samples
        // from. A fetch failure falls back to the server's English pool.
        let wordPool: string[] | undefined;
        try {
          const file = await fetchWordlist(config.wordlistId);
          const pool = file.words
            .filter((w) => w.length <= 60)
            .slice(0, RACE_WORD_POOL_MAX);
          if (pool.length > 0) wordPool = pool;
        } catch {
          wordPool = undefined;
        }
        res = await backend.race.challenge.create({
          modeId,
          wordListId: config.wordlistId,
          ...(wordPool ? { wordPool } : {}),
          ...(config.type === "timed"
            ? { durationSec: config.durationSec }
            : { wordCount: config.wordCount }),
        });
      }
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
      <Row label="Race type">
        <Chip active={config.type === "quote"} onClick={() => setConfig((c) => ({ ...c, type: "quote" }))}>
          Quote
        </Chip>
        <Chip active={config.type === "words"} onClick={() => setConfig((c) => ({ ...c, type: "words" }))}>
          Words
        </Chip>
        <Chip active={config.type === "timed"} onClick={() => setConfig((c) => ({ ...c, type: "timed" }))}>
          Timed
        </Chip>
      </Row>

      {config.type === "quote" ? (
        <Row label="Length">
          {RACE_QUOTE_GROUPS.map((g) => (
            <Chip
              key={g.id}
              active={config.quoteLengths.includes(g.id)}
              onClick={() => toggleLength(g.id)}
            >
              {g.label}
            </Chip>
          ))}
        </Row>
      ) : null}

      {config.type !== "quote" ? (
        <Row label="Word list">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={cn(
              "inline-flex h-8 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3",
              "text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground",
              "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          >
            <span className="truncate">{wordlistLabel(config.wordlistId)}</span>
            <ChevronDown size={12} className="shrink-0 text-muted-foreground" aria-hidden />
          </button>
        </Row>
      ) : null}

      {config.type === "words" ? (
        <Row label="Words">
          {WORD_COUNTS.map((w) => (
            <Chip
              key={w}
              active={config.wordCount === w}
              onClick={() => setConfig((c) => ({ ...c, wordCount: w }))}
            >
              {w}
            </Chip>
          ))}
        </Row>
      ) : null}

      {config.type === "timed" ? (
        <Row label="Seconds">
          {DURATIONS.map((d) => (
            <Chip
              key={d}
              active={config.durationSec === d}
              onClick={() => setConfig((c) => ({ ...c, durationSec: d }))}
            >
              {d}s
            </Chip>
          ))}
        </Row>
      ) : null}

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
        {pending ? "Creating…" : "Create lobby"}
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
      value={config.wordlistId}
      onPick={(id) => {
        setConfig((c) => ({ ...c, wordlistId: id }));
        setPickerOpen(false);
      }}
    />
  );

  // The primary action — creates a lobby right now from the saved config.
  const createButton = (
    <button
      type="button"
      onClick={create}
      disabled={pending}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-transparent px-3",
        "text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground",
        "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        pending && "cursor-wait opacity-60",
      )}
    >
      {pending ? "Creating…" : "Create lobby"}
    </button>
  );

  const gearClass = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-transparent text-muted-foreground",
    "transition-colors duration-150 hover:border-foreground/40 hover:bg-accent hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
  );

  if (isMobile) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          {createButton}
          <button
            type="button"
            aria-label="Lobby settings"
            onClick={() => setOpen(true)}
            className={gearClass}
          >
            <SlidersHorizontal size={14} aria-hidden />
          </button>
        </div>
        <MobileSheet open={open} onOpenChange={setOpen} title="Lobby settings">
          {body}
        </MobileSheet>
        {picker}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        {createButton}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button type="button" aria-label="Lobby settings" className={gearClass}>
              <SlidersHorizontal size={14} aria-hidden />
            </button>
          </PopoverTrigger>
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
      </div>
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
          : "border-border bg-transparent text-foreground hover:border-foreground/40 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
