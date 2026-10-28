"use client";

import {
  Check,
  ChevronDown,
  Gauge,
  Keyboard,
  type LucideIcon,
  Palette,
  PanelsTopLeft,
  Search,
  SlidersHorizontal,
  Type,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { commandKeyLabel, openCommandPalette } from "@/lib/command-palette/open";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import {
  groupForPath,
  SETTINGS_GROUPS,
  type SettingsGroup,
  type SettingsGroupId,
} from "./groups";

const GROUP_ICONS: Record<SettingsGroupId, LucideIcon> = {
  theme: Palette,
  typing: Type,
  interface: PanelsTopLeft,
  keyboard: Keyboard,
  stats: Gauge,
  behaviour: SlidersHorizontal,
  social: Users,
};

/** The settings scroller — the element sections scroll inside. */
const SCROLLER_SELECTOR = "[data-customise-scroller]";

/** Scroll-spy: which of the current group's sections is under the top
 *  band of the viewport. The band is `-10% 0px -80% 0px` — a section is
 *  active once its top passes 10% of the viewport and until the next
 *  one does — so tall and short sections are treated alike. At the very
 *  bottom of the scroller the last section wins (it may be too short to
 *  ever reach the band) unless the URL hash names a section that is on
 *  screen. Falls back to the first section. */
function useActiveSection(group: SettingsGroup | null): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!group) return;
    const ids = group.sections.map((s) => s.id);
    const visible = new Set<string>();
    let observer: IntersectionObserver | null = null;
    let scroller: HTMLElement | null = null;
    let raf = 0;
    let tries = 0;

    const pick = () => {
      if (scroller) {
        const atBottom =
          scroller.scrollTop + scroller.clientHeight >=
          scroller.scrollHeight - 4;
        if (atBottom && scroller.scrollTop > 0) {
          // A section the user jumped to (the URL hash) wins while it's
          // on screen — it may sit near the end and never reach the band.
          const hashId = window.location.hash.slice(1);
          const hashEl = ids.includes(hashId)
            ? document.getElementById(hashId)
            : null;
          if (hashEl) {
            const top = hashEl.getBoundingClientRect().top;
            const box = scroller.getBoundingClientRect();
            if (top >= box.top - 4 && top < box.bottom) {
              setActiveId(hashId);
              return;
            }
          }
          setActiveId(ids[ids.length - 1] ?? null);
          return;
        }
      }
      const first = ids.find((id) => visible.has(id));
      if (first) setActiveId(first);
    };

    const attach = () => {
      const targets = ids
        .map((id) => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
      // The page may mount a frame after the layout on a client
      // navigation — retry briefly until its sections exist.
      if (targets.length === 0 && tries++ < 20) {
        raf = requestAnimationFrame(attach);
        return;
      }
      observer = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) visible.add(e.target.id);
            else visible.delete(e.target.id);
          }
          pick();
        },
        { rootMargin: "-10% 0px -80% 0px", threshold: 0 },
      );
      for (const t of targets) observer.observe(t);
      scroller = document.querySelector<HTMLElement>(SCROLLER_SELECTOR);
      scroller?.addEventListener("scroll", pick, { passive: true });
    };

    attach();
    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      scroller?.removeEventListener("scroll", pick);
    };
  }, [group]);

  // Until the observer reports (or after switching pages), fall back to
  // the group's first section.
  const ids = group?.sections.map((s) => s.id) ?? [];
  return activeId && ids.includes(activeId) ? activeId : (ids[0] ?? null);
}

/** "Search settings" — opens the Cmd/Ctrl+K palette, which reaches every
 *  setting by name. */
export function SettingsSearchButton({
  className,
  onOpen,
}: {
  className?: string;
  /** Runs before the palette opens (e.g. close the sheet it sits in). */
  onOpen?: () => void;
}) {
  const mounted = useMounted();
  const key = mounted ? commandKeyLabel(navigator.platform) : "Ctrl";
  return (
    <button
      type="button"
      onClick={() => {
        onOpen?.();
        openCommandPalette();
      }}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-pill border border-border bg-card px-3.5 text-sm text-muted-foreground shadow-card transition-colors duration-200 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        className,
      )}
    >
      <Search size={15} aria-hidden className="shrink-0" />
      <span className="flex-1 text-left">Search settings</span>
      <kbd className="hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground sm:inline">
        {key} K
      </kbd>
    </button>
  );
}

/** Desktop settings navigation: search, then the groups. The active
 *  group is the filled brand pill (same as the top bar's active route)
 *  and lists its sections underneath as in-page anchors, with the one
 *  in view marked in orange. */
export function SettingsSidebar() {
  const pathname = usePathname();
  const current = groupForPath(pathname);
  const activeSection = useActiveSection(current);

  return (
    <nav
      data-ft-chrome
      aria-label="Settings"
      className="flex flex-col gap-5 pt-8 pb-6"
    >
      <SettingsSearchButton />
      <ul className="flex flex-col gap-1">
        {SETTINGS_GROUPS.map((g) => {
          const Icon = GROUP_ICONS[g.id];
          const isActive = current?.id === g.id;
          return (
            <li key={g.id}>
              <Link
                href={g.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2.5 rounded-pill px-3.5 text-sm font-medium transition-[color,background-color,box-shadow] duration-200",
                  isActive
                    ? "brand-surface text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon size={16} aria-hidden className="shrink-0" />
                {g.name}
              </Link>
              {isActive ? (
                <ul className="mt-1 mb-2 ml-[1.375rem] flex flex-col border-l border-border pl-1">
                  {g.sections.map((s) => {
                    const on = activeSection === s.id;
                    return (
                      <li key={s.id} className="relative">
                        {on ? (
                          <span
                            aria-hidden
                            className="absolute top-2 bottom-2 -left-[5px] w-0.5 rounded-full bg-primary"
                          />
                        ) : null}
                        <Link
                          href={`${g.href}#${s.id}`}
                          aria-current={on ? "location" : undefined}
                          className={cn(
                            "flex h-8 items-center rounded-pill px-3 text-[13px] transition-colors duration-200",
                            on
                              ? "font-medium text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {s.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile settings navigation: a text trigger naming the current page
 *  ("Theme ⌄") that opens a bottom sheet with search, every group and
 *  the current group's sections (ui-law §10.5). */
export function MobileSettingsPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const current = groupForPath(pathname);
  const activeSection = useActiveSection(current);
  const triggerText = current?.name ?? "Settings";

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
        aria-label={`Settings page: ${triggerText}. Tap to switch`}
        className="-ml-2 inline-flex h-11 min-w-0 items-center gap-1.5 rounded-pill px-3 text-base font-semibold tracking-tight text-foreground transition-colors hover:bg-accent"
      >
        <span className="truncate">{triggerText}</span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <MobileSheet open={open} onOpenChange={setOpen} title="Settings">
        <div className="flex flex-col gap-3 px-4 pt-3 pb-4">
          <SettingsSearchButton
            className="h-11"
            // Close the sheet first so the palette isn't stacked on it.
            onOpen={() => setOpen(false)}
          />
          <ul className="flex flex-col gap-1">
            {SETTINGS_GROUPS.map((g) => {
              const Icon = GROUP_ICONS[g.id];
              const isActive = current?.id === g.id;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => go(g.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex h-12 w-full items-center gap-3 rounded-pill px-4 text-left text-[15px] font-medium transition-colors",
                      isActive
                        ? "brand-surface text-primary-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <Icon size={18} aria-hidden className="shrink-0" />
                    {g.name}
                  </button>
                  {isActive ? (
                    <ul className="mt-1 mb-2 ml-7 flex flex-col border-l border-border pl-2">
                      {g.sections.map((s) => {
                        const on = activeSection === s.id;
                        return (
                          <li key={s.id}>
                            <button
                              type="button"
                              onClick={() => go(`${g.href}#${s.id}`)}
                              aria-current={on ? "location" : undefined}
                              className={cn(
                                "flex h-11 w-full items-center gap-2 rounded-pill px-3 text-left text-sm transition-colors",
                                on
                                  ? "font-medium text-primary"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                              )}
                            >
                              <Check
                                size={14}
                                aria-hidden
                                className={cn(
                                  "shrink-0",
                                  on ? "text-primary" : "text-transparent",
                                )}
                              />
                              {s.name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      </MobileSheet>
    </>
  );
}
