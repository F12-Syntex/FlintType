"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { buildFlinttypeExport, downloadJson } from "@/lib/import-export";
import { useThemeOverrides } from "@/lib/theme-customization";
import { cn } from "@/lib/utils";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
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

/** A pending theme pick — captured when the user clicks an entry,
 *  released when they confirm or cancel the warning dialog. `id`
 *  is null for the synthetic Default reset; otherwise it's the id
 *  passed to `apply`. */
type PendingPick = { id: string | null; name: string };

export function ThemesRow() {
  const { themes, activeId, apply, reset } = usePalette();
  const { overrides } = useThemeOverrides();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  // Two-phase pick: setting `pending` opens the warning dialog; the
  // dialog's confirm button reads it and runs the actual apply/reset.
  const [pending, setPending] = useState<PendingPick | null>(null);
  const [exportFirst, setExportFirst] = useState(true);
  const [exporting, setExporting] = useState(false);
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

  function requestPick(p: PendingPick) {
    setSheetOpen(false);
    // Re-picking the active theme is a no-op visually but applying
    // would still wipe customisations — guard so accidental re-clicks
    // don't trash the user's caret/font picks.
    const sameAsActive =
      (p.id === null && activeId === null) ||
      (p.id !== null && activeId === p.id);
    if (sameAsActive) return;
    setPending(p);
  }

  async function commitPending() {
    if (!pending) return;
    if (exportFirst) {
      try {
        setExporting(true);
        const data = await buildFlinttypeExport();
        const stamp = new Date().toISOString().slice(0, 10);
        downloadJson(`flinttype-settings-${stamp}.json`, data);
      } finally {
        setExporting(false);
      }
    }
    if (pending.id === null) reset();
    else apply(pending.id);
    setPending(null);
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
      {triggerSwatches}
      <span className="font-medium">{triggerName}</span>
      <ChevronDown size={14} />
    </Button>
  );

  return (
    <>
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
                  onSelect={() => requestPick({ id: null, name: "Default" })}
                />
                {themes.map((t) => (
                  <ThemeSheetItem
                    key={t.id}
                    name={t.name}
                    swatches={<ThemeSwatches theme={t} />}
                    active={activeId === t.id}
                    onSelect={() => requestPick({ id: t.id, name: t.name })}
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
              <DropdownMenuItem
                onSelect={() => requestPick({ id: null, name: "Default" })}
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
                <span className="flex-1">Default</span>
                <PaletteSwatches colors={DEFAULT_SWATCHES} />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {themes.map((t) => (
                <DropdownMenuItem
                  key={t.id}
                  onSelect={() => requestPick({ id: t.id, name: t.name })}
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
    <ConfirmDialog
      open={pending !== null}
      onOpenChange={(next) => {
        if (!next) setPending(null);
      }}
      title={pending ? `Switch to ${pending.name}?` : "Switch theme?"}
      confirmLabel={
        exporting
          ? "Exporting…"
          : exportFirst
            ? "Export & switch"
            : "Switch anyway"
      }
      cancelLabel="Cancel"
      confirmVariant="destructive"
      onConfirm={() => {
        // ConfirmDialog calls onOpenChange(false) right after — that
        // sets pending to null. Run the apply on the same tick so the
        // export-then-apply chain still has the pending value cached.
        void commitPending();
      }}
    >
      <div className="flex flex-col gap-4 text-sm leading-relaxed">
        <p>
          Switching the theme resets <strong>every appearance setting</strong>:
          colours, caret style, font, line counts, smooth scroll — all of it.
          Your current customisations will be discarded.
        </p>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/40 p-3 hover:bg-muted/60">
          <input
            type="checkbox"
            checked={exportFirst}
            onChange={(e) => setExportFirst(e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="font-medium text-foreground">
              Export my settings to a JSON file first
            </span>
            <span className="text-xs text-muted-foreground">
              Lands in your Downloads folder. You can re-import any time
              from this same page.
            </span>
          </span>
        </label>
      </div>
    </ConfirmDialog>
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
