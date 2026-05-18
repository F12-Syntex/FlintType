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
 *  Three bands inside the 5:4 tile (top to bottom):
 *    1. Aa display in the theme's font-sans + a 4-swatch palette stripe
 *    2. Two-line practice passage with a real cursor + error word —
 *       typed→primary, untyped→muted-fg, error→destructive
 *    3. Mini keyboard (2 rows, QWERTY) painted at the theme's
 *       keyboard widget design + shape settings
 *
 *  All four theme dimensions visible at a glance: palette (swatches +
 *  passage colours + key fills), radius (swatch corners), typography
 *  (Aa font + passage font + key labels), keyboard (design + shape).
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
        className="flex aspect-[5/4] flex-col gap-3 px-4 pt-3.5 pb-4"
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

        {/* Band 3 — mini keyboard */}
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
