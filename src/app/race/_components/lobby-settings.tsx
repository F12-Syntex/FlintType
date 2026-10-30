"use client";

import { ChevronDown } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { wordlistLabel } from "@/lib/wordlists/use-wordlist";
import { RACE_QUOTE_GROUPS } from "@/types/race";
import {
  DURATIONS,
  quoteLengthLabel,
  toggleQuoteLength,
  WORD_COUNTS,
  type LobbyConfig,
  type LobbyType,
} from "./lobby-config";

const TYPE_OPTIONS: { value: LobbyType; label: string }[] = [
  { value: "quote", label: "Quote" },
  { value: "words", label: "Words" },
  { value: "timed", label: "Timed" },
];

/** The private-lobby settings editor: race type, then the one or two
 *  knobs that type needs. Rendered inside the gear's popover on desktop
 *  (where "Create private lobby" sits right above it, so there's no
 *  second Create button) and inside a bottom sheet on mobile, which
 *  covers that button and so passes `onCreate` (ui-law §10.5).
 *  Single-choice rows use the shared segmented switch; quote lengths
 *  are multi-select <Toggle> pills. Selected options are the brand
 *  orange (§21). */
export function LobbySettings({
  config,
  setConfig,
  onOpenWordlist,
  onCreate,
  pending,
  error,
}: {
  config: LobbyConfig;
  setConfig: Dispatch<SetStateAction<LobbyConfig>>;
  onOpenWordlist: () => void;
  /** Mobile sheet only: adds a Create lobby button under the knobs. */
  onCreate?: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 p-1">
      <Row label="Race type">
        <SegmentedControl
          ariaLabel="Race type"
          value={config.type}
          onValueChange={(type) => setConfig((c) => ({ ...c, type }))}
          options={TYPE_OPTIONS}
          className="flex w-full flex-nowrap [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:h-auto"
        />
      </Row>

      {/* The desktop popover always opens below the launcher's buttons
       *  (no collision flip), so a type with fewer knobs just makes the
       *  panel shorter; the type switch never moves under the pointer. */}
      <div className="flex flex-col gap-4">
        {config.type === "quote" ? (
          <Row label="Quote length">
            <div role="group" aria-label="Quote length" className="flex flex-wrap gap-1.5">
              {RACE_QUOTE_GROUPS.map((g) => (
                <Toggle
                  key={g.id}
                  variant="outline"
                  pressed={config.quoteLengths.includes(g.id)}
                  onPressedChange={() =>
                    setConfig((c) => toggleQuoteLength(c, g.id))
                  }
                  className={cn(
                    "h-10 bg-card px-3 text-[13px] text-muted-foreground sm:h-8",
                    "aria-pressed:brand-surface aria-pressed:border-transparent aria-pressed:text-primary-foreground",
                    "aria-pressed:hover:text-primary-foreground",
                  )}
                >
                  {capitalize(quoteLengthLabel(g.id))}
                </Toggle>
              ))}
            </div>
          </Row>
        ) : (
          <Row label="Word list">
            <Button
              variant="outline"
              onClick={onOpenWordlist}
              className="w-full justify-between"
            >
              <span className="truncate">{wordlistLabel(config.wordlistId)}</span>
              <ChevronDown className="text-muted-foreground" aria-hidden />
            </Button>
          </Row>
        )}

        {config.type === "words" ? (
          <Row label="Words">
            <SegmentedControl
              ariaLabel="Word count"
              value={config.wordCount}
              onValueChange={(wordCount) => setConfig((c) => ({ ...c, wordCount }))}
              options={WORD_COUNTS.map((w) => ({ value: w, label: String(w) }))}
              className="flex w-full flex-nowrap tabular-nums [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:h-auto"
            />
          </Row>
        ) : null}

        {config.type === "timed" ? (
          <Row label="Seconds">
            <SegmentedControl
              ariaLabel="Race length in seconds"
              value={config.durationSec}
              onValueChange={(durationSec) =>
                setConfig((c) => ({ ...c, durationSec }))
              }
              options={DURATIONS.map((d) => ({ value: d, label: `${d}s` }))}
              className="flex w-full flex-nowrap tabular-nums [&>button]:h-10 [&>button]:flex-1 sm:[&>button]:h-auto"
            />
          </Row>
        ) : null}
      </div>

      {onCreate || error ? (
        <div className="flex flex-col gap-2 pt-1">
          {onCreate ? (
            <Button size="lg" onClick={onCreate} disabled={pending} className="w-full">
              {pending ? "Creating…" : "Create lobby"}
            </Button>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
