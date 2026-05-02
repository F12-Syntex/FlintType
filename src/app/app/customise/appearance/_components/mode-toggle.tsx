"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Option = {
  value: "light" | "dark" | "system";
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  surfaceClass: string;
  textClass: string;
  borderClass: string;
};

const OPTIONS: Option[] = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
    surfaceClass: "bg-white",
    textClass: "text-zinc-900",
    borderClass: "border-zinc-200",
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
    surfaceClass: "bg-zinc-950",
    textClass: "text-zinc-100",
    borderClass: "border-zinc-800",
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
    surfaceClass:
      "bg-[linear-gradient(135deg,#fff_0%,#fff_50%,#0a0a0a_50%,#0a0a0a_100%)]",
    textClass: "text-zinc-700",
    borderClass: "border-zinc-300",
  },
];

function Preview({ option, active }: { option: Option; active: boolean }) {
  const Icon = option.icon;
  return (
    <div
      className={cn(
        "relative h-20 w-full overflow-hidden rounded-md border transition-colors",
        option.surfaceClass,
        option.borderClass,
        active && "ring-2 ring-primary ring-offset-2 ring-offset-card",
      )}
    >
      <Icon
        size={28}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          option.textClass,
        )}
      />
    </div>
  );
}

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-32 rounded-md border border-border bg-card" />;
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold">Mode</span>
        <span className="text-xs text-muted-foreground">
          Light / dark / follow your system
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="Theme mode"
        className="grid grid-cols-3 gap-3"
      >
        {OPTIONS.map((opt) => {
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(opt.value)}
              className={cn(
                "group flex flex-col items-stretch gap-2 rounded-md border p-2 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted",
              )}
            >
              <Preview option={opt} active={active} />
              <div className="relative flex items-center justify-center">
                <span className="text-xs font-medium uppercase tracking-wider">
                  {opt.label}
                </span>
                {active ? (
                  <motion.span
                    layoutId="active-mode-bar"
                    transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                    className="absolute -bottom-1 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
      {theme && theme !== "system" ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setTheme("system")}>
            Match system
          </Button>
        </div>
      ) : null}
    </div>
  );
}
