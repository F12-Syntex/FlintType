"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

const OPTIONS: {
  value: "system" | "light" | "dark";
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
}[] = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

export function ModeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    // Reserve the same footprint so the topbar layout doesn't shift
    // on hydration.
    return <div className={cn("inline-flex h-8 w-24", className)} />;
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className={cn(
        "inline-flex items-center overflow-hidden rounded-md border border-border bg-card",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Switch to ${opt.label} mode`}
            onClick={() => setTheme(opt.value)}
            className={cn(
              "relative flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="active-mode-pill"
                transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                className="absolute inset-0 rounded-md border border-border bg-background"
              />
            ) : null}
            <Icon size={15} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
