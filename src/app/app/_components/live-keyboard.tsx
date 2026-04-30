"use client";

import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

// ─────────────────────────────────────────────────────────────────────
// All keyboard sizing, layout, and theming lives at the top of this file.
// Future: source these from `/app/customise` settings so users can swap
// layouts (qwerty-us, qwerty-uk, dvorak, colemak), key sizes, finger-zone
// visibility, heat-number visibility, etc. without touching the renderer.
// ─────────────────────────────────────────────────────────────────────

const KEY_SIZE = 44;
const KEY_GAP = 4;
const ROW_GAP = 4;
const SPACE_WIDTH = 420;

type SpecialName =
  | "tab"
  | "caps"
  | "shift"
  | "backspace"
  | "enter"
  | "ctrl"
  | "opt"
  | "cmd";

const SPECIAL_LABEL: Record<SpecialName, string> = {
  tab: "tab",
  caps: "caps",
  shift: "shift",
  backspace: "⌫",
  enter: "enter",
  ctrl: "ctrl",
  opt: "opt",
  cmd: "⌘",
};

const SPECIAL_W: Record<SpecialName, number> = {
  tab: 60,
  caps: 76,
  shift: 110,
  backspace: 72,
  enter: 92,
  ctrl: 62,
  opt: 54,
  cmd: 68,
};

type Special = { name: SpecialName };

type LayoutRow = {
  keys: string;
  offset: number;
  prefix?: Special;
  suffix?: Special;
};

type KeyboardLayout = {
  id: string;
  rows: LayoutRow[];
  bottomRow: Special[]; // modifier row, spacebar inserted between split halves
};

const QWERTY_US: KeyboardLayout = {
  id: "qwerty-us",
  rows: [
    { keys: "`1234567890-=", offset: 0, suffix: { name: "backspace" } },
    { keys: "qwertyuiop[]\\", offset: 32, prefix: { name: "tab" } },
    {
      keys: "asdfghjkl;'",
      offset: 42,
      prefix: { name: "caps" },
      suffix: { name: "enter" },
    },
    {
      keys: "zxcvbnm,./",
      offset: 58,
      prefix: { name: "shift" },
      suffix: { name: "shift" },
    },
  ],
  // The space-row is symmetrical: ctrl|opt|cmd|SPACE|cmd|opt|ctrl
  bottomRow: [
    { name: "ctrl" },
    { name: "opt" },
    { name: "cmd" },
    { name: "cmd" },
    { name: "opt" },
    { name: "ctrl" },
  ],
};

// ─── finger zones (8-finger touch typing) ──────────────────────────
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

// ─── one key ───────────────────────────────────────────────────────
type KeyProps = {
  /** Letter the key represents — used for finger-zone + heat lookup. */
  k?: string;
  label: string;
  w?: number;
  variant?: "letter" | "modifier";
  nextKey?: string;
  heat: Record<string, number>;
  recent: readonly string[];
  maxHeat: number;
};

function Key({
  k,
  label,
  w = KEY_SIZE,
  variant = "letter",
  nextKey,
  heat,
  recent,
  maxHeat,
}: KeyProps) {
  const v = (k && heat[k]) ?? 0;
  const intensity = maxHeat > 0 ? v / maxHeat : 0;
  const isNext = !!k && k === nextKey;
  const recentIdx = k ? recent.indexOf(k) : -1;
  const recentOpacity = recentIdx >= 0 ? 1 - recentIdx * 0.3 : 0;
  const isHot = intensity > 0.5;
  const isMod = variant === "modifier";

  return (
    <div
      className={cn(
        "relative flex items-center overflow-hidden rounded-md font-medium tabular-nums",
        isMod ? "justify-start pl-2" : "justify-center",
        isMod
          ? "text-[10px] uppercase tracking-[0.14em] text-ft-dim-2"
          : "text-sm text-ft-ink",
        isNext &&
          "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white",
        !isNext && "border border-ft-line-soft bg-white",
      )}
      style={{
        width: w,
        height: KEY_SIZE,
        background: isNext
          ? undefined
          : isHot
            ? `rgba(229,83,42,${0.08 + intensity * 0.4})`
            : undefined,
        boxShadow: isNext ? "0 0 0 4px rgba(229,83,42,0.18)" : undefined,
      }}
    >
      <span>{label}</span>

      {recentIdx >= 0 ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-md border-[1.5px] border-ft-ember"
          style={{ opacity: recentOpacity * 0.6 }}
          aria-hidden
        />
      ) : null}

      {!isMod && v >= 30 ? (
        <span
          className={cn(
            "absolute top-1 right-1.5 text-[8px] font-semibold tabular-nums",
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
            opacity: 0.65,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

// ─── public component ─────────────────────────────────────────────
/** Keyboard preview. No surrounding label / legend chrome — the next-
 *  expected key is shown by ember glow on the keyboard itself. Heat
 *  numbers and finger-zone hairlines provide additional information.
 *
 *  Customisation hooks (future): props for `layout`, `keySize`,
 *  `showHeatNumbers`, `showFingerZones`. The renderer is layout-driven
 *  so the same code paints any layout once that data exists. */
export function LiveKeyboard() {
  const { state } = usePractice();

  const word = state.words[state.cursorWord];
  let nextKey: string | undefined;
  if (word) {
    if (state.cursorChar < word.length) {
      nextKey = word[state.cursorChar]?.toLowerCase();
    } else {
      nextKey = "space";
    }
  }

  // Empty stubs until per-key timing tracking lands. Renderer is ready.
  const heat: Record<string, number> = {};
  const recent: readonly string[] = [];
  const maxHeat = 0;

  const layout = QWERTY_US;

  return (
    <div className="flex w-full justify-center overflow-x-auto">
      <div
        className="flex flex-col items-center"
        style={{ gap: ROW_GAP }}
      >
        {layout.rows.map((row, ri) => (
          <div
            key={ri}
            className="flex"
            style={{ gap: KEY_GAP, marginLeft: row.offset }}
          >
            {row.prefix ? (
              <Key
                label={SPECIAL_LABEL[row.prefix.name]}
                w={SPECIAL_W[row.prefix.name]}
                variant="modifier"
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
                nextKey={nextKey}
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ))}
            {row.suffix ? (
              <Key
                label={SPECIAL_LABEL[row.suffix.name]}
                w={SPECIAL_W[row.suffix.name]}
                variant="modifier"
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ) : null}
          </div>
        ))}

        {/* Bottom row: split modifiers around the spacebar */}
        <div className="flex" style={{ gap: KEY_GAP }}>
          {layout.bottomRow.slice(0, layout.bottomRow.length / 2).map((m, i) => (
            <Key
              key={`bL-${i}`}
              label={SPECIAL_LABEL[m.name]}
              w={SPECIAL_W[m.name]}
              variant="modifier"
              heat={heat}
              recent={recent}
              maxHeat={maxHeat}
            />
          ))}
          <div
            className={cn(
              "flex items-center justify-center rounded-md text-[10px] tracking-[0.18em] transition-colors",
              nextKey === "space"
                ? "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white"
                : "border border-ft-line-soft bg-white text-ft-dim",
            )}
            style={{
              width: SPACE_WIDTH,
              height: KEY_SIZE,
              boxShadow:
                nextKey === "space" ? "0 0 0 4px rgba(229,83,42,0.18)" : undefined,
            }}
          >
            SPACE
          </div>
          {layout.bottomRow.slice(layout.bottomRow.length / 2).map((m, i) => (
            <Key
              key={`bR-${i}`}
              label={SPECIAL_LABEL[m.name]}
              w={SPECIAL_W[m.name]}
              variant="modifier"
              heat={heat}
              recent={recent}
              maxHeat={maxHeat}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
