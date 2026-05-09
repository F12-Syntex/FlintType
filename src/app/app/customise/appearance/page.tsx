"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useThemeOverrides } from "@/lib/theme-customization";
import { SettingsPageHeader } from "../_components/page-header";
import { APPEARANCE_SECTIONS } from "./_sections";

export default function AppearancePage() {
  const { overrides, reset } = useThemeOverrides();
  const {
    customizedCount: appearanceCustomized,
    reset: resetAppearance,
  } = useAppearancePrefs();

  // Reset all clears every per-var theme override (colors, font, radius)
  // *and* every appearance pref (live stats, passage, result, keymap).
  // The active theme stays put — switching theme is its own deliberate
  // action via the Theme picker on /appearance/themes.
  const customizedCount = Object.keys(overrides).length + appearanceCustomized;

  function handleResetAll() {
    reset();
    resetAppearance();
  }

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        title="Appearance"
        customizedCount={customizedCount}
        onResetAll={handleResetAll}
        description="Every visual control lives under its own page so the preview at the top reflects exactly what you'll change. Pick a section to dive in."
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {APPEARANCE_SECTIONS.map((s) => (
          <li key={s.id}>
            <Link
              href={`/app/customise/appearance/${s.id}`}
              className="group flex h-full flex-col justify-between gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground group-hover:text-primary">
                  {s.name}
                </span>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {s.blurb}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors group-hover:text-foreground">
                Open
                <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
