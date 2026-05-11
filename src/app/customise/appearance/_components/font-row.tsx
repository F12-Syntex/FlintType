"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FONT_CATALOG, type FontEntry } from "@/lib/fonts/catalog";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";

/** When the picker mounts, kick `document.fonts.load(...)` for every
 *  catalog family so every option in the dropdown can paint in its
 *  actual face. Without this, the @font-face rules from /fonts/fonts.css
 *  are declared but the woff2 isn't fetched until a span actually
 *  paints — and the dropdown often closes before the swap happens, so
 *  most names render in the fallback monospace and the user can't tell
 *  fonts apart. */
function useEagerFontLoad(triggered: boolean) {
  const loadedRef = useRef(false);
  useEffect(() => {
    if (!triggered || loadedRef.current) return;
    if (typeof document === "undefined" || !document.fonts) return;
    loadedRef.current = true;
    for (const e of FONT_CATALOG) {
      // 700 + 400 mirrors what googleFontHref requests; the browser
      // dedupes if a single weight covers both.
      void document.fonts.load(`400 16px "${e.family}"`);
      void document.fonts.load(`700 16px "${e.family}"`);
    }
  }, [triggered]);
}

/** Picker entry — either a built-in system stack (resolved from
 *  globals/layout) or a Google Font shipped locally by the app. Every
 *  woff2 sits under public/fonts/ and is wired in by the global
 *  `/fonts/fonts.css` link in the root layout, so the picker just sets
 *  the override and the browser pulls the right binary on first paint. */
type FontGroup = "system" | "mono" | "sans" | "serif";
export type FontOption = {
  id: string;
  family: string;
  stack: string;
  group: FontGroup;
  google?: FontEntry;
};

const SYSTEM_OPTIONS: ReadonlyArray<FontOption> = [
  {
    id: "default",
    family: "Default",
    stack: "var(--font-sans)",
    group: "system",
  },
  { id: "mono", family: "Mono", stack: "var(--font-mono)", group: "system" },
  { id: "serif", family: "Serif", stack: "var(--font-serif)", group: "system" },
  {
    id: "system",
    family: "System UI",
    stack:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif",
    group: "system",
  },
  {
    id: "georgia",
    family: "Georgia",
    stack: "Georgia, 'Times New Roman', serif",
    group: "system",
  },
];

const ALL_OPTIONS: ReadonlyArray<FontOption> = [
  ...SYSTEM_OPTIONS,
  ...FONT_CATALOG.map((e) => ({
    id: e.id,
    family: e.family,
    stack: e.stack,
    group: e.category as FontGroup,
    google: e,
  })),
];

const GROUP_LABELS: Record<FontGroup, string> = {
  system: "System",
  mono: "Monospace",
  sans: "Sans",
  serif: "Serif",
};

const DEFAULT_OPTION = SYSTEM_OPTIONS[0];

/** Resolve which option is currently active. Three layers of matching:
 *    1. No override → Default.
 *    2. Exact stack match → the option that owns it.
 *    3. First-family-name match → handles MT-imported faces whose
 *       fallback differs from our catalog's; we still want the picker
 *       to show "Inter" as active even if MT wrote a mono fallback.
 *    4. Unknown → synthesize a one-off option labelled with whatever
 *       family the override carries, so the trigger doesn't lie about
 *       the active face. */
function findActive(stack: string | undefined): FontOption {
  if (!stack) return DEFAULT_OPTION;
  const exact = ALL_OPTIONS.find((o) => o.stack === stack);
  if (exact) return exact;
  const first =
    stack.split(",")[0]?.trim().replace(/^['"]|['"]$/g, "") ?? "";
  if (first) {
    const byFamily = ALL_OPTIONS.find((o) => o.family === first);
    if (byFamily) return byFamily;
    return { id: "custom", family: first, stack, group: "system" };
  }
  return DEFAULT_OPTION;
}

/** Square "Aa" preview rendered in the option's own font. Mirrors the
 *  rounded-sm bordered swatch ColorRow uses, but glyph instead of fill. */
function AaSwatch({
  stack,
  size,
}: {
  stack: string;
  size: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-5 w-7" : "h-7 w-9";
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-sm border border-border bg-background text-foreground shadow-inner",
        dim,
        size === "sm" ? "text-sm" : "text-base",
      )}
      style={{ fontFamily: stack, lineHeight: 1 }}
    >
      Aa
    </span>
  );
}

function FontPicker({
  active,
  onPick,
  children,
}: {
  active: FontOption;
  onPick: (opt: FontOption) => void;
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  // Either the mobile sheet or the desktop popover being open means the
  // user is about to read every font name — eagerly fetch all woff2s
  // so each label paints in its own family.
  useEagerFontLoad(sheetOpen || popoverOpen);
  const grouped = useMemo(() => {
    const out: Record<FontGroup, FontOption[]> = {
      system: [],
      mono: [],
      sans: [],
      serif: [],
    };
    for (const o of ALL_OPTIONS) out[o.group].push(o);
    return out;
  }, []);

  const groups = (Object.keys(grouped) as FontGroup[]).map((g) => (
    <section
      key={g}
      className="border-b border-border last:border-b-0"
    >
      <h3 className="sticky top-0 z-10 bg-background px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:bg-popover sm:px-3">
        {GROUP_LABELS[g]}
      </h3>
      <ul>
        {grouped[g].map((opt) => {
          const isActive = opt.id === active.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(opt);
                  setSheetOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors sm:px-3 sm:py-2 sm:text-sm",
                  "text-base sm:hover:bg-accent sm:hover:text-accent-foreground",
                  "focus:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground",
                  isActive && "bg-accent/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <AaSwatch stack={opt.stack} size="sm" />
                  <span
                    className="truncate"
                    style={{ fontFamily: opt.stack }}
                  >
                    {opt.family}
                  </span>
                </span>
                {isActive ? (
                  <Check
                    size={16}
                    className="shrink-0 text-primary"
                    aria-hidden
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  ));

  if (isMobile) {
    return (
      <>
        <span onClick={() => setSheetOpen(true)} className="contents">
          {children}
        </span>
        <MobileSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Font"
        >
          <div>{groups}</div>
        </MobileSheet>
      </>
    );
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0" sideOffset={6}>
        <div className="max-h-80 overflow-y-auto">{groups}</div>
      </PopoverContent>
    </Popover>
  );
}

/** Mirror of ColorRow for typeface selection. Mobile: tight key/value
 *  row with the "Aa" swatch button on the right. Desktop: Card with
 *  title, description, and a swatch+name+chevron trigger. ui-law §12. */
export function FontRow({
  value,
  onChange,
  onClear,
}: {
  /** Current `--ft-font-family` override (CSS stack), or undefined for
   *  default. */
  value: string | undefined;
  onChange: (option: FontOption) => void;
  onClear: () => void;
}) {
  const active = findActive(value);
  const customised = value !== undefined && value !== "";

  function handlePick(opt: FontOption) {
    onChange(opt);
  }

  return (
    <>
      {/* Mobile only — compact key/value row. */}
      <div className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 sm:hidden">
        <span className="truncate text-sm font-medium text-foreground">
          Font
        </span>
        <div className="flex items-center gap-2">
          {customised ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="h-7 px-2 text-xs"
            >
              Reset
            </Button>
          ) : null}
          <FontPicker active={active} onPick={handlePick}>
            <button
              type="button"
              aria-label="Pick font"
              className="inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-sm border border-border bg-background text-sm leading-none text-foreground shadow-inner ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              style={{ fontFamily: active.stack }}
            >
              Aa
            </button>
          </FontPicker>
        </div>
      </div>

      {/* Desktop only — Card layout per ui-law §12. */}
      <Card className="hidden rounded-md shadow-sm ring-border min-h-16 sm:block">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Font</CardTitle>
          <CardDescription>
            The typeface used in the practice passage. Every Google font ships
            with the app, so picks apply instantly and work offline.
          </CardDescription>
          <CardAction>
            <div className="flex items-center gap-3">
              <FontPicker active={active} onPick={handlePick}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label="Pick font"
                >
                  <AaSwatch stack={active.stack} size="sm" />
                  <span
                    className="truncate"
                    style={{ fontFamily: active.stack }}
                  >
                    {active.family}
                  </span>
                  <ChevronDown size={14} />
                </Button>
              </FontPicker>
              {customised ? (
                <Button variant="ghost" size="sm" onClick={onClear}>
                  Reset
                </Button>
              ) : null}
            </div>
          </CardAction>
        </CardHeader>
      </Card>
    </>
  );
}
