"use client";

import { Check, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import { APPEARANCE_SECTIONS } from "../appearance/_sections";
import { SECTIONS } from "./data";

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const TOP_LEVEL = SECTIONS.map((s) => ({
  id: s.id,
  name: titleCase(s.name),
  count: s.settings.length,
}));

/** Track which `<section id>` is currently visible inside the customise
 *  scroller so the sidebar can highlight it. The customise layout uses
 *  a custom scroller (the inner `<div className="absolute inset-0
 *  overflow-y-auto">`) rather than the window, so we observe with
 *  IntersectionObserver against the document — the threshold trips when
 *  ≥ 30 % of a section is in view, picking the topmost match. */
function useActiveAppearanceSection(active: boolean): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setActiveId(null);
      return;
    }
    const ids = APPEARANCE_SECTIONS.map((s) => s.id);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // Track ratios across all sections; pick the one closest to the
    // top of the viewport with a non-trivial visibility share. Plain
    // "first intersecting" is wrong because two sections often overlap
    // the threshold band when one is partly scrolled past.
    const ratios = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const id of ids) {
          const r = ratios.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      {
        // Bands at 0/25/50/75/100 — finer than the default lets us
        // distinguish "barely peeking" from "mostly visible".
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const t of targets) obs.observe(t);
    return () => obs.disconnect();
  }, [active]);

  return activeId;
}

/** Mobile section picker — the trigger sits in the customise header
 *  ("Themes & mode ⌄"), opening a bottom sheet that lists every section
 *  on the appearance page (as anchor jumps) plus other top-level
 *  sections (Behaviour, …). Picking a row jumps to that anchor. */
export function MobileSectionPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const onAppearance = pathname.startsWith("/app/customise/appearance");
  const activeAppearanceId = useActiveAppearanceSection(onAppearance);
  const activeName =
    APPEARANCE_SECTIONS.find((s) => s.id === activeAppearanceId)?.name ??
    (onAppearance ? "Appearance" : null);

  const topLevel = TOP_LEVEL.find((s) => pathname === `/app/customise/${s.id}`);
  const triggerText = activeName ?? topLevel?.name ?? "Sections";

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Section — currently ${triggerText}, tap to switch`}
        className={cn(
          "inline-flex h-9 max-w-[60vw] items-center gap-1.5 rounded-md px-2 -ml-2",
          "text-base font-semibold tracking-tight text-foreground",
          "transition-colors hover:bg-foreground/5 active:bg-foreground/10",
        )}
      >
        <span className="truncate">{triggerText}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      <MobileSheet open={open} onOpenChange={setOpen} title="Sections">
        <div className="flex h-full flex-col">
          <ul className="flex flex-col">
            <li className="border-b border-border bg-background/40">
              <span className="block px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Appearance
              </span>
            </li>
            {APPEARANCE_SECTIONS.map((s) => {
              const isActive = onAppearance && activeAppearanceId === s.id;
              return (
                <li key={s.id} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => go(`/app/customise/appearance#${s.id}`)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                      isActive
                        ? "bg-foreground/[0.04]"
                        : "hover:bg-foreground/5 active:bg-foreground/10",
                    )}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex h-4 w-4 shrink-0 items-center justify-center",
                        isActive ? "text-primary" : "text-transparent",
                      )}
                    >
                      <Check size={14} />
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        isActive
                          ? "font-semibold text-foreground"
                          : "text-foreground/85",
                      )}
                    >
                      {s.name}
                    </span>
                  </button>
                </li>
              );
            })}

            {TOP_LEVEL.filter((s) => s.id !== "appearance").map((s) => {
              const href = `/app/customise/${s.id}`;
              const isActive = pathname === href;
              return (
                <li
                  key={s.id}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => go(href)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors",
                      isActive
                        ? "bg-foreground/[0.04]"
                        : "hover:bg-foreground/5 active:bg-foreground/10",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 shrink-0 items-center justify-center",
                        isActive ? "text-primary" : "text-transparent",
                      )}
                    >
                      <Check size={18} />
                    </span>
                    <span className="flex-1 text-base font-semibold text-foreground">
                      {s.name}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {s.count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </MobileSheet>
    </>
  );
}

/** Desktop sidebar — Appearance is one page; its sub-section entries
 *  are anchor links into the same page. The active rail bar tracks
 *  whichever section is currently scrolled into view, so the user can
 *  always tell where they are without re-reading the section header. */
export function SettingsSidebar() {
  const pathname = usePathname();
  const onAppearance = pathname.startsWith("/app/customise/appearance");
  const activeAppearanceId = useActiveAppearanceSection(onAppearance);
  const otherTopLevel = TOP_LEVEL.filter((s) => s.id !== "appearance");

  return (
    <nav
      data-ft-chrome
      aria-label="Settings sections"
      className={cn(
        // Detached card at lg+: floats inside the global page-pad,
        // bounded by a full border and rounded corners so it reads
        // as its own surface instead of being flush against the
        // chrome edge.
        "hidden bg-background/85 backdrop-blur-md",
        "lg:flex lg:h-full lg:flex-col lg:overflow-hidden",
        "lg:rounded-md lg:border lg:border-border",
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Customise
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <ul className="flex flex-col px-2">
          <li>
            <Link
              href="/app/customise/appearance"
              aria-current={onAppearance ? "true" : undefined}
              className={cn(
                "relative flex items-center gap-2 rounded-md py-2 pr-3 pl-3 text-sm transition-colors",
                onAppearance
                  ? "text-foreground"
                  : "text-foreground/85 hover:bg-foreground/[0.03]",
              )}
            >
              <ChevronRight
                size={12}
                aria-hidden
                className="rotate-90 text-muted-foreground"
              />
              <span className="font-semibold uppercase tracking-[0.14em] text-[11px]">
                Appearance
              </span>
            </Link>
          </li>

          <li>
            <ul className="mb-3 ml-3 mt-1 flex flex-col gap-0.5 border-l border-border/60 pl-2">
              {APPEARANCE_SECTIONS.map((s) => {
                const isActive = onAppearance && activeAppearanceId === s.id;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/app/customise/appearance#${s.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative flex items-center gap-2 rounded-md py-1.5 pr-3 pl-2 text-sm transition-colors",
                        isActive
                          ? "bg-foreground/[0.04] text-foreground"
                          : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                      )}
                    >
                      {isActive ? (
                        <span
                          aria-hidden
                          className="absolute top-1.5 bottom-1.5 -left-[9px] w-0.5 rounded-full bg-primary"
                        />
                      ) : null}
                      <span className="font-medium">{s.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>

          {otherTopLevel.map((s) => {
            const href = `/app/customise/${s.id}`;
            const isActive = pathname === href;
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-between gap-3 rounded-md py-2 pr-3 pl-3 text-sm transition-colors",
                    isActive
                      ? "bg-foreground/[0.04] text-foreground"
                      : "text-foreground/85 hover:bg-foreground/[0.03]",
                  )}
                >
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute top-2 bottom-2 left-1 w-0.5 rounded-full bg-primary"
                    />
                  ) : null}
                  <span className="font-semibold uppercase tracking-[0.14em] text-[11px]">
                    {s.name}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground/70">
                    {s.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
