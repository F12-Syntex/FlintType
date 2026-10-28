"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Chip } from "../chip";
import { SliderRow } from "../controls";

/** Number controls with an "unbounded" escape for the Typing area's
 *  layout rows: how many lines show, and how wide a line can run. */

/** Numeric input for `linesRendered` paired with an All chip. `0` is
 *  the wire value for unbounded. Range 1–20 — past that you almost
 *  always want All. The most-recent numeric value is remembered so
 *  toggling All on and off again restores it instead of forcing a
 *  retype. */
export function LinesRenderedControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const isAll = value === 0;
  // Remember the last number so the All chip can act as a toggle.
  // Seeded from the current value (or 4, the default); updated whenever
  // the user types a number.
  const [lastN, setLastN] = useState<number>(value > 0 ? value : 4);
  const restoreN = value > 0 ? value : lastN;

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        inputMode="numeric"
        min={1}
        max={20}
        step={1}
        value={isAll ? "" : String(value)}
        placeholder={String(restoreN)}
        aria-label="Lines shown"
        onChange={(e) => {
          const raw = e.currentTarget.value;
          if (raw === "") return;
          const n = Number.parseInt(raw, 10);
          if (!Number.isFinite(n)) return;
          // Clamp into the supported range; All has its own affordance.
          const clamped = Math.min(20, Math.max(1, n));
          setLastN(clamped);
          onChange(clamped);
        }}
        className="h-11 w-[4.5rem] text-right tabular-nums sm:h-9"
      />
      <Chip
        label="All"
        active={isAll}
        onClick={() => {
          if (!isAll) setLastN(value);
          onChange(isAll ? restoreN : 0);
        }}
      />
    </div>
  );
}

/** Slider for `maxLineWidth` (in characters) paired with a Full chip.
 *  `0` is the wire value for "no cap". Like Lines shown, the last width
 *  is remembered so Full works as a toggle, and moving the slider while
 *  Full is on picks a width again. */
export function LineWidthControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const isFull = value === 0;
  const [lastW, setLastW] = useState<number>(value > 0 ? value : 80);
  const shownW = value > 0 ? value : lastW;

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <div className={cn("min-w-0 flex-1 sm:flex-none", isFull && "opacity-60")}>
        <SliderRow
          value={shownW}
          min={30}
          max={200}
          step={5}
          ariaLabel="Line width"
          format={(v) => (isFull ? "—" : `${v} ch`)}
          onChange={(v) => {
            setLastW(v);
            onChange(v);
          }}
        />
      </div>
      <Chip
        label="Full"
        active={isFull}
        onClick={() => {
          if (!isFull) setLastW(value);
          onChange(isFull ? shownW : 0);
        }}
      />
    </div>
  );
}
