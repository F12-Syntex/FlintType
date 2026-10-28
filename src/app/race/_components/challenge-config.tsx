"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useBackend } from "@/lib/backend";
import { useIsMobile } from "@/lib/use-is-mobile";
import { fetchWordlist } from "@/lib/wordlists/fetch";
import { RACE_WORD_POOL_MAX } from "@/types/race";
import { WordlistPicker } from "../../_components/wordlist-picker";
import { writeHostStorage } from "../c/[slug]/_components/challenge-shell";
import {
  DEFAULT_LOBBY_CONFIG,
  LOBBY_CONFIG_STORAGE_KEY,
  loadLobbyConfig,
  type LobbyConfig,
} from "./lobby-config";
import { LobbySettings } from "./lobby-settings";
import type { RaceModeId } from "./race-data";
import { raceErrorMessage } from "./race-errors";

const CREATE_FAILED = "Couldn't create the lobby. Try again in a moment.";

/** Create-a-private-lobby control for the race launcher. The outline
 *  "Create private lobby" button creates a lobby IMMEDIATELY (no config
 *  step) and navigates to it; the gear beside it opens the settings
 *  editor (popover on desktop, bottom sheet on mobile per ui-law
 *  §10.5). The config is saved per browser, so the next instant-create
 *  reuses it. A fresh lobby defaults to a small-to-large quote race.
 *
 *  Quote races draw a curated quote whose length sits in the chosen
 *  range, server-side. Word / timed races fetch the chosen MonkeyType
 *  wordlist client-side and send a capped pool the server generates
 *  the passage from. The mode (1v1 / Free-for-all) is the launcher's.
 *
 *  A failed create is reported through `onError` (the launcher shows
 *  one error line under its buttons) and inside the open editor. */
export function CreateChallengePanel({
  modeId,
  onError,
}: {
  modeId: RaceModeId;
  onError?: (message: string | null) => void;
}) {
  const isMobile = useIsMobile();
  const backend = useBackend();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate config from localStorage after mount so the server-rendered
  // markup (always the default) matches the first client render, then
  // swap in the saved value. Persist on every later change.
  const [config, setConfig] = useState<LobbyConfig>(DEFAULT_LOBBY_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setConfig(loadLobbyConfig());
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(LOBBY_CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
      // Private mode / blocked storage — the config just won't persist
      // across reloads. Creation still works from in-memory state.
    }
  }, [config, hydrated]);

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

  const body = (
    <LobbySettings
      config={config}
      setConfig={setConfig}
      onOpenWordlist={() => setPickerOpen(true)}
      onCreate={create}
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
      className="flex-1 sm:flex-none"
    >
      {pending ? "Creating…" : "Create private lobby"}
    </Button>
  );

  const gear = (
    <Button
      variant="outline"
      size="icon-lg"
      aria-label="Lobby settings"
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      <SlidersHorizontal aria-hidden />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          {createButton}
          {gear}
        </div>
        <MobileSheet open={open} onOpenChange={setOpen} title="Lobby settings">
          {/* The sheet leaves content padding to its children. */}
          <div className="px-3 pt-3 pb-6">{body}</div>
        </MobileSheet>
        {picker}
      </>
    );
  }

  return (
    <>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        {createButton}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{gear}</PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-80"
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
