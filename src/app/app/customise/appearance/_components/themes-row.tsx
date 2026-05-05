"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { type Theme, usePalette } from "@/lib/themes/use-palette";
import { useIsMobile } from "@/lib/use-is-mobile";
import { SettingsRow } from "../../_components/row";

/** The Default theme's signature colors, mirrored from `:root` in
 *  src/app/globals.css (--primary, --background, --card, --accent).
 *  Hardcoded so the Default swatches stay correct even when another
 *  palette is active — getComputedStyle would just read the override. */
const DEFAULT_SWATCHES: readonly string[] = [
  "oklch(0.6551 0.2312 34.7438)",
  "oklch(0.9450 0.0180 85)",
  "oklch(0.9650 0.0150 85)",
  "oklch(0.9656 0.0176 39.4009)",
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
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeId
    ? themes.find((t) => t.id === activeId) ?? null
    : null;

  function pickTheme(id: string) {
    apply(id);
    setSheetOpen(false);
  }
  function pickDefault() {
    reset();
    setSheetOpen(false);
  }
  function exploreThemes() {
    setSheetOpen(false);
    router.push("/app/customise/appearance/themes");
  }

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      aria-label="Pick a theme"
      onClick={isMobile ? () => setSheetOpen(true) : undefined}
    >
      {active ? (
        <ThemeSwatches theme={active} />
      ) : (
        <PaletteSwatches colors={DEFAULT_SWATCHES} />
      )}
      <span className="font-medium">{active ? active.name : "Default"}</span>
      <ChevronDown size={14} />
    </Button>
  );

  return (
    <SettingsRow
      label="Theme"
      control={
        isMobile ? (
          <>
            {trigger}
            <MobileSheet
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              title="Theme"
            >
              <ul className="flex flex-col">
                <ThemeSheetItem
                  name="Default"
                  swatches={
                    <PaletteSwatches colors={DEFAULT_SWATCHES} />
                  }
                  active={activeId === null}
                  onSelect={pickDefault}
                />
                {themes.map((t) => (
                  <ThemeSheetItem
                    key={t.id}
                    name={t.name}
                    swatches={<ThemeSwatches theme={t} />}
                    active={activeId === t.id}
                    onSelect={() => pickTheme(t.id)}
                  />
                ))}
                <li>
                  <button
                    type="button"
                    onClick={exploreThemes}
                    className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left text-base font-semibold text-primary transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                  >
                    Explore themes…
                    <ChevronDown
                      size={16}
                      className="shrink-0 -rotate-90 text-primary"
                    />
                  </button>
                </li>
              </ul>
            </MobileSheet>
          </>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  router.push("/app/customise/appearance/themes")
                }
                className="gap-3"
              >
                <span className="inline-flex h-4 w-4 items-center justify-center" />
                <span className="flex-1 font-medium">Explore themes…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      }
    />
  );
}

function ThemeSheetItem({
  name,
  swatches,
  active,
  onSelect,
}: {
  name: string;
  swatches: React.ReactNode;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors",
          active
            ? "bg-foreground/[0.04]"
            : "hover:bg-foreground/5 active:bg-foreground/10",
        )}
      >
        <span
          className={cn(
            "inline-flex h-5 w-5 shrink-0 items-center justify-center",
            active ? "text-primary" : "text-transparent",
          )}
        >
          <Check size={18} />
        </span>
        <span className="flex-1 text-base font-semibold text-foreground">
          {name}
        </span>
        <span className="shrink-0">{swatches}</span>
      </button>
    </li>
  );
}
