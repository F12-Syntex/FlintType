"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";
import { SettingsRow } from "../../_components/row";

/** The Default theme's signature colors, mirrored from `:root` in
 *  src/app/globals.css (--primary, --background, --card, --accent).
 *  Hardcoded so the Default swatches stay correct even when another
 *  palette is active — getComputedStyle would just read the override. */
const DEFAULT_SWATCHES: readonly string[] = [
  "oklch(0.6551 0.2312 34.7438)", // --primary  (coral/ember)
  "oklch(0.9450 0.0180 85)", // --background (paper)
  "oklch(0.9650 0.0150 85)", // --card       (lifted paper)
  "oklch(0.9656 0.0176 39.4009)", // --accent (warm tint)
];

function PaletteSwatches({ colors }: { colors: readonly string[] }) {
  return (
    <span className="inline-flex gap-0.5">
      {colors.map((c, i) => (
        <span
          key={`${c}-${i}`}
          aria-hidden
          className="inline-block h-3 w-3 rounded-full border border-border"
          style={{ backgroundColor: c }}
        />
      ))}
    </span>
  );
}

function ThemeSwatches({ theme }: { theme: Theme }) {
  if (theme.id === BACKGROUND_REACTIVE_ID) {
    // The reactive theme has no static colours — it's whatever the
    // user's current background image happens to be. Render a single
    // gradient swatch as a visual hint.
    return (
      <span
        aria-hidden
        className="inline-block h-3 w-12 rounded-full border border-border"
        style={{
          background:
            "linear-gradient(90deg, oklch(0.65 0.23 35), oklch(0.7 0.18 200), oklch(0.6 0.2 280))",
        }}
      />
    );
  }
  const v = theme.cssVars.light;
  const colors = ["primary", "background", "card", "accent"]
    .map((k) => v[k])
    .filter((c): c is string => Boolean(c));
  return <PaletteSwatches colors={colors} />;
}

export function ThemesRow() {
  const { themes, activeId, apply, reset } = usePalette();
  const router = useRouter();
  const active = activeId
    ? themes.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <SettingsRow
      label="Theme"
      control={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              aria-label="Pick a theme"
            >
              {active ? (
                <ThemeSwatches theme={active} />
              ) : (
                <PaletteSwatches colors={DEFAULT_SWATCHES} />
              )}
              <span className="font-medium">
                {active ? active.name : "Default"}
              </span>
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem
              onSelect={() => router.push("/app/customise/appearance/themes")}
              className="gap-3"
            >
              <span className="inline-flex h-4 w-4 items-center justify-center text-primary">
                <Sparkles size={14} />
              </span>
              <span className="flex-1 font-medium">Explore themes…</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={reset} className="gap-3">
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center",
                  activeId === null ? "text-primary" : "text-transparent",
                )}
              >
                <Check size={14} />
              </span>
              <span className="flex-1">Default</span>
              <PaletteSwatches colors={DEFAULT_SWATCHES} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {themes.map((t) => (
              <DropdownMenuItem
                key={t.id}
                onSelect={() => apply(t.id)}
                className="gap-3"
              >
                <span
                  className={cn(
                    "inline-flex h-4 w-4 items-center justify-center",
                    activeId === t.id ? "text-primary" : "text-transparent",
                  )}
                >
                  <Check size={14} />
                </span>
                <span className="flex-1">{t.name}</span>
                <ThemeSwatches theme={t} />
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}
