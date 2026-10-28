"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { LeaderboardPreset } from "@/types/leaderboard";
import { AUDIENCES, TOOLBAR_SWITCH } from "./filter-controls";
import {
  filterSummary,
  type LeaderboardFilters,
  PRESET_GROUPS,
  SCOPES,
  WINDOWS,
} from "./filters";
import type { SetLeaderboardFilters } from "./use-leaderboard-params";

/** Full-width segmented switch inside the sheet. */
const SHEET_SWITCH = `${TOOLBAR_SWITCH} flex w-full [&>button]:flex-1 [&>button]:whitespace-nowrap`;

type LengthKind = "any" | "words" | "time";

function kindOf(preset: LeaderboardPreset): LengthKind {
  if (preset === "any") return "any";
  return preset.startsWith("w") ? "words" : "time";
}

const WORDS = PRESET_GROUPS[0]!.options;
const TIMES = PRESET_GROUPS[1]!.options;

/** Mobile (< md) filters: one pill that names the current slice and
 *  opens the bottom sheet (ui-law §10.5). Changes apply immediately;
 *  Done just closes the sheet. */
export function FilterSheet({
  filters,
  setFilters,
  signedIn,
}: {
  filters: LeaderboardFilters;
  setFilters: SetLeaderboardFilters;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const summary = filterSummary(filters);
  const kind = kindOf(filters.preset);

  function pickKind(next: LengthKind) {
    if (next === kind) return;
    if (next === "any") setFilters({ preset: "any" });
    else if (next === "words") setFilters({ preset: "w25" });
    else setFilters({ preset: "t60" });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filters: ${summary}`}
        className="h-11 w-full justify-start gap-2.5 px-4 md:hidden [&>svg]:text-muted-foreground"
      >
        <SlidersHorizontal aria-hidden />
        <span className="min-w-0 flex-1 truncate text-left text-foreground">
          {summary}
        </span>
        <ChevronDown aria-hidden />
      </Button>

      <MobileSheet open={open} onOpenChange={setOpen} title="Filters">
        <div className="flex min-h-full flex-col">
          <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
          <Field label="Mode">
            <SegmentedControl
              ariaLabel="Mode"
              value={filters.scope}
              onValueChange={(scope) => setFilters({ scope })}
              options={SCOPES.map((s) => ({ value: s.id, label: s.label }))}
              className={SHEET_SWITCH}
            />
          </Field>
          <Field label="Window">
            <SegmentedControl
              ariaLabel="Time window"
              value={filters.window}
              onValueChange={(window) => setFilters({ window })}
              options={WINDOWS.map((w) => ({ value: w.id, label: w.short }))}
              className={SHEET_SWITCH}
            />
          </Field>
          <Field label="Length">
            <SegmentedControl
              ariaLabel="Length type"
              value={kind}
              onValueChange={pickKind}
              options={[
                { value: "any", label: "All" },
                { value: "words", label: "Words" },
                { value: "time", label: "Time" },
              ]}
              className={SHEET_SWITCH}
            />
            {kind !== "any" ? (
              <SegmentedControl
                ariaLabel={kind === "words" ? "Word count" : "Seconds"}
                value={filters.preset}
                onValueChange={(preset) => setFilters({ preset })}
                options={(kind === "words" ? WORDS : TIMES).map((o) => ({
                  value: o.id,
                  label: o.short,
                }))}
                className={SHEET_SWITCH}
              />
            ) : null}
          </Field>
          {signedIn ? (
            <Field label="Whose runs">
              <SegmentedControl
                ariaLabel="Whose runs"
                value={filters.audience}
                onValueChange={(audience) => setFilters({ audience })}
                options={AUDIENCES}
                className={SHEET_SWITCH}
              />
            </Field>
          ) : null}
          </div>
          {/* Done stays reachable however short the screen is. */}
          <div className="sticky bottom-0 mt-auto border-t border-border bg-background px-4 py-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </MobileSheet>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
