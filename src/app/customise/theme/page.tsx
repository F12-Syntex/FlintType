"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { ModeSwitcher } from "@/components/ui/mode-switcher";
import {
  DEFAULT_BACKGROUND,
  type BackgroundPrefs,
  useBackgroundPrefs,
} from "@/lib/background-prefs";
import { type ThemeVar, useThemeOverrides } from "@/lib/theme-customization";
import { overriddenVars } from "@/lib/themes/overrides";
import { cn } from "@/lib/utils";
import { LabelWithDesc } from "../_components/controls";
import {
  countCustomised,
  countOverriddenVars,
  getGroup,
  GROUP_THEME_VARS,
  sectionTitle,
} from "../_components/groups";
import { SettingsPageHeader } from "../_components/page-header";
import { SettingsRow } from "../_components/row";
import { BackgroundRow } from "../_components/rows/background-row";
import { ColorRow } from "../_components/rows/color-row";
import {
  BackgroundPreview,
  ColorPreview,
  ThemePreview,
} from "../_components/rows/section-previews";
import { ThemesRow } from "../_components/rows/themes-row";
import { SettingsSection } from "../_components/settings-section";

type ColorRowDef = {
  var: ThemeVar;
  label: string;
  desc: string;
  /** Passage tokens default to another var until the user picks one. */
  fallbackVar?: `--${string}`;
};

/** The four colours most people change. */
const MAIN_COLORS: readonly ColorRowDef[] = [
  { var: "--primary", label: "Accent", desc: "Buttons, the caret and selected options." },
  { var: "--background", label: "Background", desc: "The page behind everything." },
  { var: "--foreground", label: "Text", desc: "Headings and body text." },
  {
    var: "--ft-passage-typed",
    label: "Typed letters",
    desc: "Letters you've already typed. Matches the accent until you change it.",
    fallbackVar: "--primary",
  },
];

/** Everything else, behind "More colours". */
const MORE_COLORS: readonly ColorRowDef[] = [
  {
    var: "--ft-passage-untyped",
    label: "Letters to type",
    desc: "Letters you haven't reached yet.",
    fallbackVar: "--muted-foreground",
  },
  {
    var: "--ft-passage-error",
    label: "Wrong letters",
    desc: "Letters you typed by mistake.",
    fallbackVar: "--destructive",
  },
  { var: "--primary-foreground", label: "Text on accent", desc: "Labels on accent-coloured buttons." },
  { var: "--accent", label: "Hover tint", desc: "The soft fill behind hovered items." },
  { var: "--accent-foreground", label: "Text on hover tint", desc: "Labels on top of the hover tint." },
  { var: "--card", label: "Cards", desc: "Panels, menus and settings lists." },
  { var: "--muted", label: "Quiet surfaces", desc: "Chips, tracks and secondary panels." },
  { var: "--muted-foreground", label: "Quiet text", desc: "Captions and secondary details." },
  { var: "--border", label: "Outlines", desc: "Thin lines around cards and controls." },
  { var: "--input", label: "Input fields", desc: "Text fields and switches when off." },
  { var: "--ring", label: "Focus ring", desc: "The outline around a focused control." },
];

function swatchFor(row: ColorRowDef): string {
  return row.fallbackVar
    ? `var(${row.var}, var(${row.fallbackVar}))`
    : `var(${row.var})`;
}

const BACKGROUND_KEYS = Object.keys(DEFAULT_BACKGROUND) as (keyof BackgroundPrefs)[];

export default function ThemeSettingsPage() {
  const group = getGroup("theme");
  const { overrides, setVar, clearVar, reset: resetOverrides } =
    useThemeOverrides();
  const {
    prefs: background,
    hasLocalImage,
    reset: resetBackground,
    clearLocalImage,
  } = useBackgroundPrefs();
  const themeVars = GROUP_THEME_VARS.theme ?? [];
  const hiddenChanged = countOverriddenVars(
    overrides,
    MORE_COLORS.map((c) => c.var),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const showMore = moreOpen || hiddenChanged > 0;

  const customizedCount =
    countOverriddenVars(overrides, themeVars) +
    countCustomised(background, DEFAULT_BACKGROUND, BACKGROUND_KEYS) +
    (hasLocalImage ? 1 : 0);

  function handleReset() {
    // Only colours belong to this page. If nothing else is overridden,
    // the full reset also returns a forked "Custom" palette to the one
    // it came from.
    const others = overriddenVars(overrides).filter(
      (v) => !themeVars.includes(v),
    );
    if (others.length === 0) resetOverrides();
    else for (const v of themeVars) clearVar(v);
    resetBackground();
    clearLocalImage();
  }

  const colorRow = (row: ColorRowDef) => (
    <ColorRow
      key={row.var}
      label={row.label}
      desc={row.desc}
      swatchColor={swatchFor(row)}
      value={overrides[row.var]}
      onChange={(hex) => setVar(row.var, hex)}
      onClear={() => clearVar(row.var)}
    />
  );

  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <SettingsPageHeader
        group={group}
        customizedCount={customizedCount}
        onReset={handleReset}
      />

      <SettingsSection
        id="themes"
        title={sectionTitle(group, "themes")}
        description="Pick a palette and choose light or dark."
        preview={<ThemePreview />}
      >
        <ThemesRow />
        <SettingsRow
          inline
          label={
            <LabelWithDesc
              title="Mode"
              desc="System follows your device setting."
            />
          }
          control={<ModeSwitcher />}
        />
        <SettingsRow
          inline
          label={
            <LabelWithDesc
              title="Palette gallery"
              desc="See every palette side by side at full size."
            />
          }
          control={
            <Link
              href="/customise/appearance/themes"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-9 sm:h-8",
              )}
            >
              Browse
            </Link>
          }
        />
      </SettingsSection>

      <SettingsSection
        id="colors"
        title={sectionTitle(group, "colors")}
        description="Change single colours on top of your palette."
        preview={<ColorPreview />}
      >
        {MAIN_COLORS.map(colorRow)}
        {showMore ? (
          <>
            {MORE_COLORS.map(colorRow)}
            {hiddenChanged === 0 ? (
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-expanded
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:px-5"
              >
                Fewer colours
                <ChevronDown size={16} aria-hidden className="rotate-180" />
              </button>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={false}
            className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent sm:px-5"
          >
            <span>
              More colours{" "}
              <span className="text-muted-foreground tabular-nums">
                ({MORE_COLORS.length})
              </span>
            </span>
            <ChevronDown size={16} aria-hidden className="text-muted-foreground" />
          </button>
        )}
      </SettingsSection>

      <SettingsSection
        id="background"
        title={sectionTitle(group, "background")}
        description="Put an image behind the app."
        preview={<BackgroundPreview />}
      >
        <BackgroundRow />
      </SettingsSection>
    </div>
  );
}
