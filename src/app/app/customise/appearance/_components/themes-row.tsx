"use client";

import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type Theme, useTheme } from "@/lib/themes/use-theme";

function ThemeSwatches({ theme }: { theme: Theme }) {
  // Pull a few representative colors so the card communicates the
  // palette at a glance — no need to apply the theme to see it.
  const v = theme.cssVars.light;
  const order = ["primary", "background", "card", "accent", "border"];
  const swatches = order
    .map((k) => v[k])
    .filter((c): c is string => Boolean(c));
  return (
    <div className="flex">
      {swatches.map((c, i) => (
        <span
          key={`${c}-${i}`}
          aria-hidden
          className={cn(
            "h-7 w-7 rounded-full border-2 border-card",
            i > 0 && "-ml-2",
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}

function ThemeCard({
  theme,
  active,
  onApply,
}: {
  theme: Theme;
  active: boolean;
  onApply: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onApply}
      aria-pressed={active}
      className={cn(
        "flex flex-col gap-3 rounded-md border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border bg-card hover:bg-muted",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ThemeSwatches theme={theme} />
          <span className="text-sm font-semibold text-foreground">
            {theme.name}
          </span>
        </div>
        {active ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Check size={14} /> Active
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Tap to apply</span>
        )}
      </div>
      {theme.source ? (
        <a
          href={theme.source}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex w-fit items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          source <ExternalLink size={11} />
        </a>
      ) : null}
    </button>
  );
}

export function ThemesRow() {
  const { themes, activeId, apply, reset } = useTheme();

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Themes</CardTitle>
        <CardDescription>
          Pick a complete look — every color, font, and radius swaps at once.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-3 px-4 pb-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={reset}
            aria-pressed={activeId === null}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border p-3 text-left transition-colors",
              activeId === null
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span className="text-sm font-semibold">Default</span>
            {activeId === null ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Check size={14} /> Active
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Tap to apply</span>
            )}
          </button>
          {themes.map((t) => (
            <ThemeCard
              key={t.id}
              theme={t}
              active={activeId === t.id}
              onApply={() => apply(t.id)}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Want more? Maintainers can add a tweakcn theme with{" "}
          <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono">
            yarn themes:add &lt;url&gt;
          </code>
          .
        </p>

        {activeId !== null ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset to default
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
