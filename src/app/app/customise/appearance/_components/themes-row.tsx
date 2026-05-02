"use client";

import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { type Theme, useTheme } from "@/lib/themes/use-theme";

function ThemeSwatches({ theme }: { theme: Theme }) {
  const v = theme.cssVars.light;
  const colors = ["primary", "background", "card", "accent"]
    .map((k) => v[k])
    .filter((c): c is string => Boolean(c));
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

export function ThemesRow() {
  const { themes, activeId, apply, reset } = useTheme();
  const active = activeId
    ? themes.find((t) => t.id === activeId) ?? null
    : null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
      <span className="text-sm font-medium text-foreground">Theme</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            aria-label="Pick a theme"
          >
            {active ? (
              <ThemeSwatches theme={active} />
            ) : (
              <span className="inline-block h-3 w-3 rounded-full border border-border bg-muted" />
            )}
            <span className="font-medium">
              {active ? active.name : "Default"}
            </span>
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem onSelect={reset} className="gap-3">
            <span
              className={cn(
                "inline-flex h-4 w-4 items-center justify-center",
                activeId === null ? "text-primary" : "text-transparent",
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
                  activeId === t.id ? "text-primary" : "text-transparent",
                )}
              >
                <Check size={14} />
              </span>
              <span className="flex-1">{t.name}</span>
              <ThemeSwatches theme={t} />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
