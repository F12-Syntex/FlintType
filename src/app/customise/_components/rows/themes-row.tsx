"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { PaletteSwitchDialog } from "@/components/palette-switch-dialog";
import { useThemeOverrides } from "@/lib/theme-customization";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
import { type Theme, usePalette } from "@/lib/themes/use-palette";
import { usePaletteSwitch } from "@/lib/themes/use-palette-switch";
import { useIsMobile } from "@/lib/use-is-mobile";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";

/** The Default theme's signature colors, mirrored from `:root` in
 *  src/app/globals.css (--primary, --background, --card, --accent).
 *  Hardcoded so the Default swatches stay correct even when another
 *  palette is active — getComputedStyle would just read the override. */
const DEFAULT_SWATCHES: readonly string[] = [
  "#f97316",
  "oklch(0.9450 0.0180 85)",
  "oklch(0.9650 0.0150 85)",
  "oklch(0.9050 0.0140 85)",
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
  const { themes, activeId } = usePalette();
  const { overrides } = useThemeOverrides();
  const { requestPick: requestSwitch, dialog, focusDialog } =
    usePaletteSwitch();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Set when a pick opened the warning, so the menu doesn't pull focus
  // back to its trigger and out of the dialog as it closes.
  const handingOff = useRef(false);
  const isCustom = activeId === CUSTOM_THEME_ID;
  const active = activeId && !isCustom
    ? themes.find((t) => t.id === activeId) ?? null
    : null;
  const customSwatches = customSwatchesFromOverrides(overrides);
  const triggerName = isCustom ? "Custom" : active ? active.name : "Default";
  const triggerSwatches = isCustom ? (
    <PaletteSwatches colors={customSwatches} />
  ) : active ? (
    <ThemeSwatches theme={active} />
  ) : (
    <PaletteSwatches colors={DEFAULT_SWATCHES} />
  );

  function requestPick(id: string | null, name: string) {
    setSheetOpen(false);
    handingOff.current = requestSwitch(id, name) === "confirm";
  }

  function exploreThemes() {
    setSheetOpen(false);
    router.push("/customise/appearance/themes");
  }

  const trigger = (
    <Button
      variant="outline"
      size="sm"
      className="h-11 gap-2 sm:h-8"
      aria-label={`Palette: ${triggerName}. Change`}
      onClick={isMobile ? () => setSheetOpen(true) : undefined}
    >
      {triggerSwatches}
      <span className="font-medium">{triggerName}</span>
      <ChevronDown size={14} aria-hidden />
    </Button>
  );

  return (
    <>
      <SettingsRow
        inline
        label={
          <LabelWithDesc
            title="Palette"
            desc="The colours used across the whole app."
          />
        }
        control={
          isMobile ? (
            <>
              {trigger}
              <MobileSheet
                open={sheetOpen}
                onOpenChange={setSheetOpen}
                title="Palette"
              >
                <ul className="flex flex-col">
                  <ThemeSheetItem
                    name="Default"
                    swatches={
                      <PaletteSwatches colors={DEFAULT_SWATCHES} />
                    }
                    active={activeId === null}
                    onSelect={() => requestPick(null, "Default")}
                  />
                  {themes.map((t) => (
                    <ThemeSheetItem
                      key={t.id}
                      name={t.name}
                      swatches={<ThemeSwatches theme={t} />}
                      active={activeId === t.id}
                      onSelect={() => requestPick(t.id, t.name)}
                    />
                  ))}
                  <li>
                    <button
                      type="button"
                      onClick={exploreThemes}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left text-base font-semibold text-primary transition-colors hover:bg-accent active:bg-foreground/10"
                    >
                      Browse all palettes
                    </button>
                  </li>
                </ul>
              </MobileSheet>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                collisionPadding={16}
                onCloseAutoFocus={(e) => {
                  if (!handingOff.current) return;
                  handingOff.current = false;
                  e.preventDefault();
                  focusDialog();
                }}
                className="flex max-h-[min(70vh,var(--radix-dropdown-menu-content-available-height))] w-[17rem] flex-col overflow-hidden p-0"
              >
                <div className="flex-none p-1">
                  <DropdownMenuItem
                    onSelect={() => requestPick(null, "Default")}
                    className="gap-3"
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 items-center justify-center",
                        activeId === null ? "text-primary" : "text-transparent",
                      )}
                    >
                      <Check size={14} />
                    </span>
                    <span className="flex-1 truncate">Default</span>
                    <PaletteSwatches colors={DEFAULT_SWATCHES} />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1">
                  {themes.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onSelect={() => requestPick(t.id, t.name)}
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
                      <span className="flex-1 truncate">{t.name}</span>
                      <ThemeSwatches theme={t} />
                    </DropdownMenuItem>
                  ))}
                </div>
                <div className="flex-none border-t border-border p-1">
                  <DropdownMenuItem
                    onSelect={() =>
                      router.push("/customise/appearance/themes")
                    }
                    className="gap-3"
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center" />
                    <span className="flex-1 font-medium">Browse all palettes</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      />
      <PaletteSwitchDialog {...dialog} />
    </>
  );
}

/** Build a 4-swatch preview for the "Custom" entry from whatever the
 *  user has actually overridden. Falls back to the default swatches for
 *  any role they haven't touched, so the picker pill always shows four
 *  filled circles instead of a sparse / blank row. */
function customSwatchesFromOverrides(
  overrides: Record<string, string | undefined>,
): readonly string[] {
  return [
    overrides["--primary"] ?? DEFAULT_SWATCHES[0]!,
    overrides["--background"] ?? DEFAULT_SWATCHES[1]!,
    overrides["--card"] ?? DEFAULT_SWATCHES[2]!,
    overrides["--accent"] ?? DEFAULT_SWATCHES[3]!,
  ];
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
            : "hover:bg-accent active:bg-foreground/10",
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
