import { DEFAULT_KEYBOARD } from "@/lib/keyboard-settings";
import { THEME_PRESETS } from "@/lib/themes/presets";
import { MiniKeyboard } from "./mini-keyboard";
import { type PreviewVars, resolveRadius } from "./preview-vars";
import { TileShell } from "./tile-shell";

/** A 4-swatch palette stripe — primary / accent / muted-fg / border —
 *  pinned to the right of the Aa display. Quick visual signal for the
 *  full palette before the eye reaches the passage / keyboard. */
function PaletteStripe({
  vars,
  radius,
}: {
  vars: PreviewVars;
  radius: string;
}) {
  const colors = [
    vars.primary,
    vars.accent,
    vars["muted-foreground"],
    vars.border,
  ];
  return (
    <div className="flex shrink-0 items-center gap-[3px]">
      {colors.map((c, i) => (
        <span
          key={i}
          aria-hidden
          className="block size-3"
          style={{ backgroundColor: c, borderRadius: radius }}
        />
      ))}
    </div>
  );
}

/** Strip the leading family from a CSS font-family list so the chip
 *  reads as a name, not a fallback chain. Quotes get unwrapped too. */
function primaryFontName(font: string | undefined): string {
  if (!font) return "Mono";
  const first = font.split(",")[0]?.trim() ?? "";
  return first.replace(/^['"]|['"]$/g, "") || "Mono";
}

/** Theme tile — frameless slice of the app under the candidate theme.
 *  Four bands inside the 5:4 tile (top to bottom):
 *    1. Aa display in the theme's font-sans + font-name eyebrow +
 *       4-swatch palette stripe (corners at theme radius)
 *    2. Two-line practice passage with a real cursor + error word —
 *       typed→primary, untyped→muted-fg, error→destructive
 *    3. Chrome sampler row — primary CTA + outline button + accent
 *       tag chip + WPM/ACC stat readout. Every product surface
 *       reuses these primitives, so the band telegraphs how the
 *       theme reads on buttons, chips, and tabular stats at once
 *    4. Mini QWERTY keyboard (top + home rows) painted at the
 *       theme's keyboard widget `design` + `shape`; home-row F+J
 *       pegs lit in primary when the preset enables it
 *
 *  All four theme dimensions visible at a glance: palette (swatches +
 *  passage colours + chip + key fills), radius (swatches + buttons +
 *  chip + key corners), typography (Aa font + passage font + button
 *  labels + stats), keyboard (design + shape).
 *  `accentName` paints the name in primary — used by the Custom tile. */
export function ThemeTile({
  name,
  themeId,
  vars,
  active,
  onPick,
  accentName = false,
}: {
  name: string;
  /** Theme id used to look up `presets.keyboard`. Null for the
   *  Default / Custom tiles — those fall back to DEFAULT_KEYBOARD
   *  inside MiniKeyboard. */
  themeId: string | null;
  vars: PreviewVars;
  active: boolean;
  onPick: () => void;
  accentName?: boolean;
}) {
  const radius = resolveRadius(vars);
  const sans = vars["font-sans"];
  const mono = vars["font-mono"] ?? sans;
  // Theme presets are Partial<KeyboardSettings> — merge with defaults
  // so MiniKeyboard receives a fully-populated settings object.
  const keyboardPreset = themeId
    ? { ...DEFAULT_KEYBOARD, ...(THEME_PRESETS[themeId]?.keyboard ?? {}) }
    : DEFAULT_KEYBOARD;

  return (
    <TileShell
      active={active}
      onPick={onPick}
      ariaLabel={`Apply ${name} theme`}
      name={name}
      accentName={accentName}
    >
      <div
        className="flex aspect-[5/4] flex-col gap-2.5 px-4 pt-3.5 pb-4"
        style={{ backgroundColor: vars.background, color: vars.foreground }}
      >
        {/* Band 1 — Aa display + font name + palette stripe */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span
              className="leading-none"
              style={{
                fontFamily: sans,
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
                color: vars.foreground,
              }}
            >
              Aa
            </span>
            <span
              className="truncate text-[9px] uppercase tracking-[0.18em]"
              style={{ color: vars["muted-foreground"], fontFamily: mono }}
            >
              {primaryFontName(sans)}
            </span>
          </div>
          <PaletteStripe vars={vars} radius={radius} />
        </div>

        {/* Band 2 — passage with cursor + error word */}
        <p
          className="leading-snug"
          style={{ fontFamily: mono, fontSize: "11px" }}
        >
          <span style={{ color: vars.primary }}>the qu</span>
          <span
            aria-hidden
            className="inline-block align-baseline"
            style={{
              width: "1px",
              height: "12px",
              marginLeft: "-1px",
              marginRight: "-1px",
              backgroundColor: vars.primary,
              borderRadius: "1px",
              transform: "translateY(2px)",
            }}
          />
          <span style={{ color: vars["muted-foreground"] }}>
            ick brown fox jumps over the&nbsp;
          </span>
          <span
            style={{
              color: vars.destructive ?? vars.primary,
              borderBottom: `1.5px solid ${vars.destructive ?? vars.primary}`,
            }}
          >
            lazy
          </span>
          <span style={{ color: vars["muted-foreground"] }}> dog.</span>
        </p>

        {/* Band 3 — chrome sampler: buttons, tag chip, stats */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center text-[8px] font-semibold uppercase leading-none tracking-[0.14em]"
              style={{
                backgroundColor: vars.primary,
                color: vars["primary-foreground"],
                borderRadius: radius,
                padding: "4px 7px",
                fontFamily: mono,
              }}
            >
              Start
            </span>
            <span
              className="inline-flex items-center justify-center text-[8px] font-semibold uppercase leading-none tracking-[0.14em]"
              style={{
                backgroundColor: "transparent",
                color: vars.foreground,
                border: `1px solid ${vars.border}`,
                borderRadius: radius,
                padding: "3px 6px",
                fontFamily: mono,
              }}
            >
              Esc
            </span>
            <span
              className="inline-flex items-center gap-1 text-[8px] font-medium uppercase leading-none tracking-[0.14em]"
              style={{
                backgroundColor: vars.accent,
                color: vars["accent-foreground"] ?? vars.foreground,
                borderRadius: radius,
                padding: "3px 6px",
                fontFamily: mono,
              }}
            >
              <span
                aria-hidden
                className="block size-1 rounded-full"
                style={{ backgroundColor: vars.primary }}
              />
              Tag
            </span>
          </div>
          <div
            className="flex items-baseline gap-1"
            style={{ fontFamily: mono }}
          >
            <span
              className="text-[12px] font-bold tabular-nums leading-none"
              style={{ color: vars.foreground }}
            >
              92
            </span>
            <span
              className="text-[7px] uppercase tracking-[0.18em]"
              style={{ color: vars["muted-foreground"] }}
            >
              wpm
            </span>
            <span
              aria-hidden
              className="mx-0.5 block size-0.5 rounded-full"
              style={{ backgroundColor: vars["muted-foreground"], opacity: 0.5 }}
            />
            <span
              className="text-[12px] font-bold tabular-nums leading-none"
              style={{ color: vars.primary }}
            >
              98
            </span>
            <span
              className="text-[7px] uppercase tracking-[0.18em]"
              style={{ color: vars["muted-foreground"] }}
            >
              acc
            </span>
          </div>
        </div>

        {/* Band 4 — mini keyboard, pinned to the bottom of the tile */}
        <div className="mt-auto flex justify-center">
          <MiniKeyboard
            vars={vars}
            keyboard={keyboardPreset}
            fontFamily={mono}
          />
        </div>
      </div>
    </TileShell>
  );
}
