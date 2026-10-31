"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBackend } from "@/lib/backend";
import { useIsMobile } from "@/lib/use-is-mobile";
import { fetchWordlist } from "@/lib/wordlists/fetch";
import { RACE_WORD_POOL_MAX } from "@/types/race";
import { WordlistPicker } from "../../_components/wordlist-picker";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { lobbyConfigSummary, type LobbyConfig } from "./lobby-config";
import { LobbySettings } from "./lobby-settings";
import type { RaceModeId } from "./race-data";
import { raceErrorMessage } from "./race-errors";

const CREATE_FAILED = "Couldn't create the lobby. Try again in a moment.";

/** The launcher's action row: `lead` (Find race), then the outline
 *  "Create private lobby" button, which creates a lobby IMMEDIATELY (no
 *  config step) and navigates to it, then the gear that opens the
 *  settings editor. On desktop the editor is a popover anchored to the
 *  whole row: it always opens below it, centred and as wide as the row
 *  (no collision flip over the heading). On mobile it's a bottom sheet
 *  (ui-law §10.5). The config is saved per browser (`useLobbyConfig`),
 *  so the next instant-create reuses it. A fresh lobby defaults to a
 *  small-to-large quote race.
 *
 *  Quote races draw a curated quote whose length sits in the chosen
 *  range, server-side. Word / timed races fetch the chosen MonkeyType
 *  wordlist client-side and send a capped pool the server generates
 *  the passage from. The mode (1v1 / Free-for-all) is the launcher's.
 *
 *  A failed create is reported through `onError` (the launcher shows
 *  one error line under its buttons) and inside the open editor. */
export function CreateChallengePanel({
  lead,
  modeId,
  config,
  setConfig,
  onError,
}: {
  /** The launcher's primary (Find race), first in the row. */
  lead: ReactNode;
  modeId: RaceModeId;
  /** The saved lobby config (owned by the launcher via useLobbyConfig,
   *  so its summary line and this editor share one value). */
  config: LobbyConfig;
  setConfig: Dispatch<SetStateAction<LobbyConfig>>;
  onError?: (message: string | null) => void;
}) {
  const isMobile = useIsMobile();
  const backend = useBackend();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryId = useId();
  // What the instant-create will make, from the saved settings. Read on
  // hover (desktop) and by screen readers, never as a line of page copy.
  const summary = lobbyConfigSummary(config, wordlistLabel(config.wordlistId));

  function reportError(message: string | null) {
    setError(message);
    onError?.(message);
  }

  async function create() {
    if (pending) return;
    setPending(true);
    reportError(null);
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
    } catch (err) {
      setPending(false);
      reportError(raceErrorMessage(err, CREATE_FAILED));
    }
  }

  const settings = (withCreate: boolean) => (
    <LobbySettings
      config={config}
      setConfig={setConfig}
      onOpenWordlist={() => setPickerOpen(true)}
      onCreate={withCreate ? create : undefined}
      pending={pending}
      error={error}
    />
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

  // The instant-create action, from the saved config. Outline: "Find
  // race" is the launcher's one filled primary.
  const createButton = (
    <Button
      variant="outline"
      size="lg"
      onClick={create}
      disabled={pending}
      aria-describedby={summaryId}
      className="flex-1 sm:flex-none"
    >
      {pending ? "Creating…" : "Create private lobby"}
      <span id={summaryId} className="sr-only">
        {summary}
      </span>
    </Button>
  );

  const gear = (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Lobby settings"
      aria-expanded={open}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className="aria-expanded:border-primary/40 aria-expanded:text-primary"
    >
      <SlidersHorizontal aria-hidden />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <div className="flex w-full flex-col items-stretch gap-3">
          {lead}
          <div className="flex w-full items-center gap-2">
            {createButton}
            {gear}
          </div>
        </div>
        <MobileSheet open={open} onOpenChange={setOpen} title="Lobby settings">
          {/* The sheet leaves content padding to its children. It covers
           *  the launcher's Create button, so it brings its own. */}
          <div className="px-3 pt-3 pb-6">{settings(true)}</div>
        </MobileSheet>
        {picker}
      </>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="flex items-center gap-2">
            {lead}
            <Tooltip>
              <TooltipTrigger asChild>{createButton}</TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs" aria-hidden>
                {summary}
              </TooltipContent>
            </Tooltip>
            <PopoverTrigger asChild>{gear}</PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent
          side="bottom"
          align="center"
          sideOffset={12}
          // Always below the row: flipping above it covered the heading
          // and the mode switch, and moved the panel mid-click.
          avoidCollisions={false}
          // On a short window the panel scrolls inside itself instead of
          // running off the bottom.
          className="max-h-[calc(var(--radix-popover-content-available-height)-1rem)] w-(--radix-popover-trigger-width) min-w-80 overflow-y-auto text-left"
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
          {settings(false)}
        </PopoverContent>
      </Popover>
      {picker}
    </>
  );
}
