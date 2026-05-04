"use client";

import { Check, ChevronDown } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  findFontByStack,
  FONT_CATALOG,
  type FontCategory,
  type FontEntry,
} from "@/lib/fonts/catalog";
import { loadGoogleFont } from "@/lib/fonts/loader";
import { useThemeOverrides } from "@/lib/theme-customization";
import { cn } from "@/lib/utils";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

const FONT_OPTIONS: ReadonlyArray<{
  id: string;
  label: string;
  stack: string;
}> = [
  { id: "default", label: "Sans", stack: "var(--font-sans)" },
  { id: "mono", label: "Mono", stack: "var(--font-mono)" },
  { id: "serif", label: "Serif", stack: "var(--font-serif)" },
  {
    id: "system",
    label: "System",
    stack:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
  },
];

const SIZE_PRESETS: ReadonlyArray<{ label: string; scale: number }> = [
  { label: "S", scale: 0.875 },
  { label: "M", scale: 1.0 },
  { label: "L", scale: 1.125 },
  { label: "XL", scale: 1.25 },
];

// Spacing between words on the passage. The default (0.25em) matches
// what the passage shipped with — every other preset is relative to that.
const WORD_SPACING_PRESETS: ReadonlyArray<{ label: string; em: number }> = [
  { label: "Tight", em: 0.05 },
  { label: "Snug", em: 0.15 },
  { label: "Normal", em: 0.25 },
  { label: "Loose", em: 0.45 },
  { label: "Airy", em: 0.7 },
];

const CATEGORY_LABELS: Record<FontCategory, string> = {
  mono: "Monospace",
  sans: "Sans",
  serif: "Serif",
};

function HeroPreview({
  fontStack,
  scale,
  wordSpacingEm,
}: {
  fontStack: string | undefined;
  scale: number;
  wordSpacingEm: number;
}) {
  return (
    <div
      className="rounded-md border border-border bg-card px-5 py-6"
      style={{
        fontFamily: fontStack ?? "var(--font-sans)",
        fontSize: `${scale}rem`,
        wordSpacing: `${wordSpacingEm}em`,
      }}
    >
      <p className="text-3xl font-bold tracking-tight text-foreground">
        The quick brown fox
      </p>
      <p className="mt-2 text-base text-muted-foreground">
        jumps over the lazy dog · 0123456789 — &amp;@#%
      </p>
    </div>
  );
}

/** Popover-driven Google Fonts picker. Lists every catalog entry
 *  grouped by category. Clicking an item is the "first time chosen"
 *  event: we inject the font's CSS <link> (browser then fetches and
 *  caches the woff2 from gstatic.com), then write `--ft-font-family`
 *  with the entry's stack so the passage re-paints in the new face. */
function GoogleFontsPicker({
  active,
  onPick,
  onClear,
}: {
  active: FontEntry | null;
  onPick: (entry: FontEntry) => void;
  onClear: () => void;
}) {
  const grouped = useMemo(() => {
    const out: Record<FontCategory, FontEntry[]> = {
      mono: [],
      sans: [],
      serif: [],
    };
    for (const e of FONT_CATALOG) out[e.category].push(e);
    return out;
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Pick a Google font"
        >
          <span
            className="truncate"
            style={{ fontFamily: active?.stack }}
            title={active?.family}
          >
            {active ? active.family : "Browse Google Fonts"}
          </span>
          <ChevronDown size={14} aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-0"
        sideOffset={6}
      >
        <div className="max-h-80 overflow-y-auto">
          {(Object.keys(grouped) as FontCategory[]).map((cat) => (
            <section key={cat} className="border-b border-border last:border-b-0">
              <h3 className="sticky top-0 bg-popover px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </h3>
              <ul>
                {grouped[cat].map((entry) => {
                  const isActive = active?.id === entry.id;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onPick(entry)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground",
                          isActive && "bg-accent/60",
                        )}
                      >
                        <span
                          className="truncate"
                          style={{ fontFamily: entry.stack }}
                        >
                          {entry.family}
                        </span>
                        {isActive ? (
                          <Check
                            size={14}
                            className="shrink-0 text-primary"
                            aria-hidden
                          />
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        {active ? (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              onClick={onClear}
            >
              Clear Google font
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function TypographyRows() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const family = overrides["--ft-font-family"];
  const scale = overrides["--ft-font-scale"]
    ? Number.parseFloat(overrides["--ft-font-scale"])
    : 1;
  const activeFamily =
    FONT_OPTIONS.find((o) => o.stack === family)?.id ?? "default";
  const activeScale =
    SIZE_PRESETS.find((p) => Math.abs(p.scale - scale) < 0.01)?.label ?? null;
  const wordSpacing = overrides["--ft-word-spacing"]
    ? Number.parseFloat(overrides["--ft-word-spacing"])
    : 0.25;
  const activeWordSpacing =
    WORD_SPACING_PRESETS.find((p) => Math.abs(p.em - wordSpacing) < 0.01)
      ?.label ?? null;
  const activeGoogleFont = findFontByStack(family);
  const customised =
    family !== undefined ||
    overrides["--ft-font-scale"] !== undefined ||
    overrides["--ft-word-spacing"] !== undefined;

  function pickGoogleFont(entry: FontEntry) {
    // First-time pick is also the first-time fetch: inject the <link>
    // and the browser will pull the woff2 only when a span actually
    // paints in this family (passage / hero preview re-render below).
    loadGoogleFont(entry);
    setVar("--ft-font-family", entry.stack);
  }

  return (
    <div className="flex flex-col gap-3">
      <HeroPreview
        fontStack={family}
        scale={scale}
        wordSpacingEm={wordSpacing}
      />

      <SettingsRow
        label="Family"
        control={
          <ChipGroup>
            {FONT_OPTIONS.map((opt) => (
              <Chip
                key={opt.id}
                label={
                  // Render each chip's label in its own face so the user
                  // sees what they're picking inline.
                  <span style={{ fontFamily: opt.stack }}>{opt.label}</span>
                }
                active={activeFamily === opt.id && !activeGoogleFont}
                onClick={() =>
                  opt.id === "default"
                    ? clearVar("--ft-font-family")
                    : setVar("--ft-font-family", opt.stack)
                }
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Google font"
        control={
          <GoogleFontsPicker
            active={activeGoogleFont}
            onPick={pickGoogleFont}
            onClear={() => clearVar("--ft-font-family")}
          />
        }
      />

      <SettingsRow
        label="Size"
        control={
          <ChipGroup>
            {SIZE_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={activeScale === p.label}
                onClick={() => setVar("--ft-font-scale", String(p.scale))}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Word spacing"
        control={
          <ChipGroup>
            {WORD_SPACING_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={activeWordSpacing === p.label}
                onClick={() => setVar("--ft-word-spacing", `${p.em}em`)}
              />
            ))}
          </ChipGroup>
        }
      />

      {customised ? (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              clearVar("--ft-font-family");
              clearVar("--ft-font-scale");
              clearVar("--ft-word-spacing");
            }}
          >
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}
