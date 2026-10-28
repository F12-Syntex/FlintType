"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { PageHeader } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { useThemeOverrides } from "@/lib/theme-customization";
import { BACKGROUND_REACTIVE_ID } from "@/lib/themes/background-reactive";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
import { type Theme, usePalette } from "@/lib/themes/use-palette";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import {
  customVarsFromOverrides,
  DEFAULT_VARS,
  pickVars,
  type PreviewVars,
} from "./preview-vars";
import { ReactiveTile } from "./reactive-tile";
import { ThemeTile } from "./theme-tile";

type Entry =
  | { kind: "default"; vars: PreviewVars; active: boolean }
  | { kind: "reactive"; active: boolean }
  | { kind: "custom"; vars: PreviewVars; active: boolean }
  | { kind: "theme"; theme: Theme; vars: PreviewVars; active: boolean };

export function ThemeExplorer() {
  const { themes, activeId, apply, reset } = usePalette();
  const { overrides } = useThemeOverrides();
  const { resolvedTheme } = useTheme();
  // The server can't know the resolved mode, so the hydrating render
  // paints light like the server did; the next render switches to the
  // real mode and React patches the tile styles (it doesn't patch
  // mismatched attributes during hydration itself).
  const mounted = useMounted();
  const mode: "light" | "dark" =
    mounted && resolvedTheme === "dark" ? "dark" : "light";
  const isCustom = activeId === CUSTOM_THEME_ID;

  function handlePick(id: string | null) {
    if (id === null) reset();
    else apply(id);
  }

  const entries: Entry[] = [];
  // Custom tile only appears when active — the user can't *pick* into
  // Custom from this surface (Custom is a state created by editing
  // colours or importing MT), so it'd be confusing to show otherwise.
  if (isCustom) {
    entries.push({
      kind: "custom",
      vars: customVarsFromOverrides(overrides, mode),
      active: true,
    });
  }
  entries.push({
    kind: "default",
    vars: DEFAULT_VARS[mode],
    active: !isCustom && activeId === null,
  });
  for (const t of themes) {
    if (t.id === BACKGROUND_REACTIVE_ID) {
      entries.push({
        kind: "reactive",
        active: !isCustom && activeId === t.id,
      });
      continue;
    }
    const vars = pickVars(t, mode);
    if (!vars) continue;
    entries.push({
      kind: "theme",
      theme: t,
      vars,
      active: !isCustom && activeId === t.id,
    });
  }

  return (
    <section className="flex flex-col gap-8 text-foreground">
      <PageHeader
        title="All palettes"
        description="Each tile shows the app in that palette. Tap one to use it."
        className="sm:items-center"
        aside={
          <Link
            href="/customise/theme"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-11 sm:h-8 lg:hidden",
            )}
          >
            <ArrowLeft aria-hidden />
            Back to Theme
          </Link>
        }
      />

      <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 md:grid-cols-3">
        {entries.map((e) => {
          if (e.kind === "custom") {
            return (
              <li key="custom">
                <ThemeTile
                  name="Custom"
                  themeId={null}
                  vars={e.vars}
                  active={e.active}
                  onPick={() => {
                    /* already active — no-op. Picking another tile
                       resets the override slice and exits Custom. */
                  }}
                  accentName
                />
              </li>
            );
          }
          if (e.kind === "default") {
            return (
              <li key="default">
                <ThemeTile
                  name="Default"
                  themeId={null}
                  vars={e.vars}
                  active={e.active}
                  onPick={() => handlePick(null)}
                />
              </li>
            );
          }
          if (e.kind === "reactive") {
            return (
              <li key="reactive">
                <ReactiveTile
                  active={e.active}
                  onPick={() => handlePick(BACKGROUND_REACTIVE_ID)}
                />
              </li>
            );
          }
          return (
            <li key={e.theme.id}>
              <ThemeTile
                name={e.theme.name}
                themeId={e.theme.id}
                vars={e.vars}
                active={e.active}
                onPick={() => handlePick(e.theme.id)}
              />
            </li>
          );
        })}
      </ol>
    </section>
  );
}
