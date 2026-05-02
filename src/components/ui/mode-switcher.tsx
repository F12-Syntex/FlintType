"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import { type Mode, useMode } from "@/lib/themes/use-mode";

const OPTIONS: {
  value: Mode;
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
}[] = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
];

export function ModeSwitcher({ className }: { className?: string }) {
  const { mode, setMode, mounted } = useMode();

  if (!mounted) {
    // Reserve the same footprint so the topbar layout doesn't jump on
    // hydration. Three 32-px circles + ring = 96 + 2 = ~98px.
    return <div className={cn("inline-flex h-8 w-24", className)} />;
  }

  return (
    <motion.div
      role="radiogroup"
      aria-label="Theme mode"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-flex items-center overflow-hidden rounded-full border border-border bg-card",
        className,
      )}
    >
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Switch to ${opt.label} mode`}
            onClick={() => setMode(opt.value)}
            className={cn(
              "relative flex size-8 cursor-pointer items-center justify-center rounded-full transition-colors",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="active-mode-pill"
                transition={{ type: "spring", bounce: 0.25, duration: 0.5 }}
                className="absolute inset-0 rounded-full border border-border bg-background"
              />
            ) : null}
            <Icon size={15} className="relative" />
          </button>
        );
      })}
    </motion.div>
  );
}
