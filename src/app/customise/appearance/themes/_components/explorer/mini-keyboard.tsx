import type { CSSProperties } from "react";
import { DEFAULT_KEYBOARD, type KeyboardSettings } from "@/lib/keyboard-settings";
import type { PreviewVars } from "./preview-vars";

/** Static 2-row letter grid sampled from QWERTY — top row + home row.
 *  Two rows is the smallest sample that still reads as "a keyboard"
 *  and shows the design + shape variations clearly. */
const ROWS: readonly (readonly string[])[] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
];

const HOME_PEGS = new Set(["f", "j"]);

/** Resolve the chunk of styling each `design` variant applies to a
 *  key cell. Mirrors the real Keyboard widget's design vocabulary
 *  (solid / outline / ghost / lifted / glass) — same five names, at
 *  preview scale.
 *
 *  Borders are returned per side (`edge` for top/left/right, `bottom`
 *  for the bottom) so the home-row peg can swap just the bottom edge
 *  without mixing the `border` shorthand with a longhand, which React
 *  warns about when the tile re-renders in another mode. */
function keyStyle(
  design: KeyboardSettings["design"],
  vars: PreviewVars,
): { surface: CSSProperties; edge: string; bottom: string } {
  const cardFg = vars["card-foreground"] ?? vars.foreground;
  const line = `1px solid ${vars.border}`;
  switch (design) {
    case "solid":
      return {
        surface: { backgroundColor: vars.card, color: cardFg },
        edge: "none",
        bottom: "none",
      };
    case "outline":
      return {
        surface: { backgroundColor: "transparent", color: vars.foreground },
        edge: line,
        bottom: line,
      };
    case "ghost":
      return {
        surface: {
          backgroundColor: "transparent",
          color: vars["muted-foreground"],
        },
        edge: "none",
        bottom: "none",
      };
    case "lifted":
      return {
        surface: { backgroundColor: vars.card, color: cardFg },
        edge: line,
        bottom: `2px solid ${vars.border}`,
      };
    case "glass":
      return {
        surface: { backgroundColor: vars.card, color: cardFg, opacity: 0.85 },
        edge: line,
        bottom: line,
      };
  }
}

/** Per-`shape` corner radius. Pill caps at 8px because key cells are
 *  wider than they are tall — a true 50% would oval them and lose the
 *  square-keyboard read entirely. The theme's own `radius` value
 *  doesn't apply here; key radius is owned by the keyboard `shape`
 *  setting in the real widget too. */
function shapeRadius(shape: KeyboardSettings["shape"]): string {
  switch (shape) {
    case "square":
      return "0";
    case "rounded":
      return "3px";
    case "pill":
      return "8px";
  }
}

/** Compact non-interactive keyboard rendered inside a preview tile.
 *  Reads `keyboard` from the theme's preset (with DEFAULT_KEYBOARD as
 *  fallback for themes that don't carry one, including the Default
 *  palette). Sized to land in the bottom band of a ~5:4 tile across
 *  the full responsive grid. */
export function MiniKeyboard({
  vars,
  keyboard = DEFAULT_KEYBOARD,
  fontFamily,
}: {
  vars: PreviewVars;
  keyboard?: KeyboardSettings;
  fontFamily?: string;
}) {
  const baseKey = keyStyle(keyboard.design, vars);
  const radius = shapeRadius(keyboard.shape);

  return (
    <div className="flex flex-col gap-[2px]">
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          // Home row offsets ~half a key like a real staggered
          // keyboard so the two rows don't read as a perfect grid.
          className="flex justify-center gap-[2px]"
          style={ri === 1 ? { paddingLeft: "10px" } : undefined}
        >
          {row.map((ch) => {
            const isHome = HOME_PEGS.has(ch);
            const lit = keyboard.highlightHomeRow && isHome;
            return (
              <span
                key={ch}
                className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[8px] font-semibold leading-none"
                style={{
                  ...baseKey.surface,
                  borderTop: baseKey.edge,
                  borderLeft: baseKey.edge,
                  borderRight: baseKey.edge,
                  // Home-row pegs: a thin primary underline rather
                  // than a fill swap. Reads as a peg cue without
                  // dominating the row visually.
                  borderBottom: lit
                    ? `2px solid ${vars.primary}`
                    : baseKey.bottom,
                  borderRadius: radius,
                  fontFamily,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
