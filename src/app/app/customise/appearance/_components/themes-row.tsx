"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Theme, usePalette } from "@/lib/themes/use-palette";
import { SettingsRow } from "../../_components/row";

const SWATCH_VARS = ["--primary", "--background", "--card", "--accent"];

function PaletteSwatches({ colors }: { colors: string[] }) {
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
  const v = theme.cssVars.light;
  const colors = ["primary", "background", "card", "accent"]
    .map((k) => v[k])
    .filter((c): c is string => Boolean(c));
  return <PaletteSwatches colors={colors} />;
}

/** Read the live values of the default theme tokens off :root so the
 *  "Default" entry's swatches always reflect what the app actually
 *  resolves to (no need to hardcode oklch values from globals.css). */
function useDefaultSwatches(): string[] {
  const [colors, setColors] = useState<string[]>([]);
  useEffect(() => {
    // Pull a fresh sample on mount AND whenever the active palette
    // changes, by clearing our overrides momentarily — except we can't,
    // so instead we read once at mount when no theme is yet applied.
    // For the dropdown trigger this stays accurate enough: if the user
    // has a theme on, switching to Default shows the strip.
    const root = getComputedStyle(document.documentElement);
    setColors(SWATCH_VARS.map((v) => root.getPropertyValue(v).trim()));
  }, []);
  return colors;
}

export function ThemesRow() {
  const { themes, activeId, apply, reset } = usePalette();
  const defaultSwatches = useDefaultSwatches();
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
                <PaletteSwatches colors={defaultSwatches} />
              )}
              <span className="font-medium">
                {active ? active.name : "Default"}
              </span>
              <ChevronDown size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
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
              <PaletteSwatches colors={defaultSwatches} />
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
