"use client";

import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

// ─── finger zones ────────────────────────────────────────────────────
const FINGER: Record<string, number> = {
  q: 1, a: 1, z: 1, "1": 1,
  w: 2, s: 2, x: 2, "2": 2,
  e: 3, d: 3, c: 3, "3": 3,
  r: 4, f: 4, v: 4, "4": 4, t: 4, g: 4, b: 4, "5": 4,
  y: 5, h: 5, n: 5, "6": 5, u: 5, j: 5, m: 5, "7": 5,
  i: 6, k: 6, ",": 6, "8": 6,
  o: 7, l: 7, ".": 7, "9": 7,
  p: 8, ";": 8, "'": 8, "/": 8, "0": 8, "[": 8, "]": 8, "\\": 8, "-": 8, "=": 8,
};
const FINGER_COLOR = [
  "transparent", "#7A6BA0", "#5B7FA8", "#5A9180", "#9A7A52",
  "#9A7A52", "#5A9180", "#5B7FA8", "#7A6BA0",
];

// ─── layout ──────────────────────────────────────────────────────────
type RowDef = {
  keys: string;
  offset: number;
  prefix?: { label: string; w: number };
  suffix?: { label: string; w: number };
};

const ROWS: RowDef[] = [
  { keys: "`1234567890-=", offset: 0, suffix: { label: "⌫", w: 60 } },
  { keys: "qwertyuiop[]\\", offset: 28, prefix: { label: "tab", w: 50 } },
  { keys: "asdfghjkl;'", offset: 36, prefix: { label: "caps", w: 64 }, suffix: { label: "enter", w: 76 } },
  { keys: "zxcvbnm,./", offset: 50, prefix: { label: "shift", w: 88 }, suffix: { label: "shift", w: 96 } },
];

// ─── one key ─────────────────────────────────────────────────────────
function Key({
  k,
  label,
  w = 36,
  isPrefix,
  isSuffix,
  nextKey,
  heat,
  recent,
  maxHeat,
}: {
  k?: string;
  label: string;
  w?: number;
  isPrefix?: boolean;
  isSuffix?: boolean;
  nextKey?: string;
  heat: Record<string, number>;
  recent: readonly string[];
  maxHeat: number;
}) {
  const v = (k && heat[k]) ?? 0;
  const intensity = maxHeat > 0 ? v / maxHeat : 0;
  const isNext = !!k && k === nextKey;
  const recentIdx = k ? recent.indexOf(k) : -1;
  const recentOpacity = recentIdx >= 0 ? 1 - recentIdx * 0.3 : 0;
  const isHot = intensity > 0.5;

  return (
    <div
      className={cn(
        "relative flex h-9 items-center text-xs font-medium tabular-nums",
        isPrefix || isSuffix ? "justify-start pl-1.5" : "justify-center",
        isPrefix || isSuffix
          ? "text-[9px] uppercase tracking-[0.14em] text-ft-dim-2"
          : "text-ft-ink",
        isNext && "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white",
        !isNext && "border border-ft-line-soft bg-white",
      )}
      style={{
        width: w,
        background: isNext
          ? undefined
          : isHot
            ? `rgba(229,83,42,${0.08 + intensity * 0.4})`
            : undefined,
        boxShadow: isNext ? "0 0 0 4px rgba(229,83,42,0.15)" : undefined,
      }}
    >
      <span>{label}</span>
      {recentIdx >= 0 ? (
        <span
          className="pointer-events-none absolute inset-0 border-[1.5px] border-ft-ember"
          style={{ opacity: recentOpacity * 0.6 }}
          aria-hidden
        />
      ) : null}
      {!isPrefix && !isSuffix && v >= 30 ? (
        <span
          className={cn(
            "absolute top-0.5 right-1 text-[7px] font-semibold tabular-nums",
            isNext ? "text-white" : "text-ft-ember",
          )}
        >
          +{v}
        </span>
      ) : null}
      {k ? (
        <span
          className="absolute right-0 bottom-0 left-0 h-0.5"
          style={{
            background: FINGER_COLOR[FINGER[k] || 0] || "transparent",
            opacity: 0.6,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function LegendChip({
  color,
  outline,
  label,
}: {
  color: string;
  outline?: boolean;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.16em] text-ft-dim">
      <span
        className="size-2.5 border-[1.5px]"
        style={{
          background: outline ? "transparent" : color,
          borderColor: color,
        }}
        aria-hidden
      />
      {label}
    </span>
  );
}

// ─── public component ────────────────────────────────────────────────
/** Always-visible keyboard preview. Reads cursor / phase from
 *  practice state and lights up the next-expected key. Heat &
 *  recently-pressed are wired but currently unused (no per-key
 *  latency tracking yet); they'll fill in when the timing layer
 *  lands. */
export function LiveKeyboard() {
  const { state } = usePractice();

  const word = state.words[state.cursorWord];
  let nextKey: string | undefined;
  if (word) {
    if (state.cursorChar < word.length) {
      nextKey = word[state.cursorChar]?.toLowerCase();
    } else {
      // After last char, the user must press space to advance.
      nextKey = "space";
    }
  }

  // Reserved for the future — keep the rendering branches alive.
  const heat: Record<string, number> = {};
  const recent: readonly string[] = [];
  const maxHeat = 0;

  const showStats = state.phase === "running";

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <Tag>
          KEYBOARD
          {nextKey ? (
            <>
              {" · NEXT: "}
              <span className="font-semibold text-ft-ember">
                &quot;{nextKey === " " ? "space" : nextKey}&quot;
              </span>
            </>
          ) : null}
        </Tag>
        {showStats ? (
          <div className="flex flex-wrap gap-4">
            <LegendChip color="var(--color-ft-ember)" label="NEXT EXPECTED" />
            <LegendChip
              color="rgba(229,83,42,0.3)"
              label="HOT KEY · SLOW"
            />
            <LegendChip color="var(--color-ft-ink)" outline label="RECENTLY PRESSED" />
          </div>
        ) : (
          <Tag tone="ink">
            <span className="text-ft-dim">PREVIEW · </span>
            light up the next-expected key
          </Tag>
        )}
      </div>
      <div className="flex flex-col items-center gap-1 overflow-x-auto">
        {ROWS.map((row, ri) => (
          <div
            key={ri}
            className="flex gap-1"
            style={{ marginLeft: row.offset }}
          >
            {row.prefix ? (
              <Key
                label={row.prefix.label}
                w={row.prefix.w}
                isPrefix
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ) : null}
            {row.keys.split("").map((k, i) => (
              <Key
                key={k + i}
                k={k}
                label={k}
                w={36}
                nextKey={nextKey}
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ))}
            {row.suffix ? (
              <Key
                label={row.suffix.label}
                w={row.suffix.w}
                isSuffix
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ) : null}
          </div>
        ))}
        <div className="flex gap-1">
          <Key
            label="ctrl"
            w={50}
            isPrefix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
          <Key
            label="opt"
            w={44}
            isPrefix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
          <Key
            label="⌘"
            w={56}
            isPrefix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
          <div
            className={cn(
              "flex h-9 items-center justify-center border text-[9px] tracking-[0.18em] transition-colors",
              nextKey === "space"
                ? "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white"
                : "border-ft-line-soft bg-white text-ft-dim",
            )}
            style={{
              width: 360,
              boxShadow:
                nextKey === "space" ? "0 0 0 4px rgba(229,83,42,0.15)" : undefined,
            }}
          >
            SPACE
          </div>
          <Key
            label="⌘"
            w={56}
            isSuffix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
          <Key
            label="opt"
            w={44}
            isSuffix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
          <Key
            label="ctrl"
            w={50}
            isSuffix
            heat={heat}
            recent={recent}
            maxHeat={maxHeat}
          />
        </div>
      </div>
    </div>
  );
}
