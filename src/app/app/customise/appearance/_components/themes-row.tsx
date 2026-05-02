"use client";

import { Check, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Theme, useTheme } from "@/lib/themes/use-theme";

function Swatch({ color, size = 4 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block rounded-full border border-border"
      style={{
        backgroundColor: color,
        width: `${size * 0.25}rem`,
        height: `${size * 0.25}rem`,
      }}
    />
  );
}

function ThemeSwatches({ theme, size = 4 }: { theme: Theme; size?: number }) {
  const v = theme.cssVars.light;
  const colors = ["primary", "background", "card", "accent"]
    .map((k) => v[k])
    .filter((c): c is string => Boolean(c));
  return (
    <span className="inline-flex gap-0.5">
      {colors.map((c, i) => (
        <Swatch key={`${c}-${i}`} color={c} size={size} />
      ))}
    </span>
  );
}

export function ThemesRow() {
  const { themes, activeId, apply, reset } = useTheme();
  const active = activeId
    ? themes.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Theme</CardTitle>
        <CardDescription>
          Pick a complete look — every color, font, and radius swaps at once.
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  aria-label="Pick a theme"
                >
                  {active ? (
                    <ThemeSwatches theme={active} size={4} />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border border-border bg-card" />
                  )}
                  <span className="font-medium">
                    {active ? active.name : "Default"}
                  </span>
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[14rem]">
                <DropdownMenuLabel>Themes</DropdownMenuLabel>
                <DropdownMenuItem onSelect={reset} className="gap-3">
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center",
                      activeId === null
                        ? "text-primary"
                        : "text-transparent",
                    )}
                  >
                    <Check size={14} />
                  </span>
                  <span className="flex-1">Default</span>
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
                        activeId === t.id
                          ? "text-primary"
                          : "text-transparent",
                      )}
                    >
                      <Check size={14} />
                    </span>
                    <span className="flex-1">{t.name}</span>
                    <ThemeSwatches theme={t} size={4} />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {activeId !== null ? (
              <Button variant="ghost" size="sm" onClick={reset}>
                Reset
              </Button>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>

      {active?.source ? (
        <div className="flex items-center justify-end px-4 pb-3">
          <a
            href={active.source}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            source <ExternalLink size={11} />
          </a>
        </div>
      ) : null}

      <p className="px-4 pb-4 text-xs text-muted-foreground">
        Maintainers add tweakcn themes with{" "}
        <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono">
          yarn themes:add &lt;url&gt;
        </code>
        .
      </p>
    </Card>
  );
}
