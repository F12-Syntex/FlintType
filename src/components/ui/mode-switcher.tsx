"use client";

import { motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ComponentType } from "react";
import { useMounted } from "@/lib/use-mounted";
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
  const mounted = useMounted();

  if (!mounted) {
    // Reserve the same footprint so the topbar layout doesn't shift
    // on hydration.
    return <div className={cn("inline-flex h-[2.875rem] w-[8.125rem] sm:h-9 sm:w-[6.5rem]", className)} />;
  }

  return (
    <div
      // data-ft-topbar-pill — globals.css §15 flattens this container's
      // bg + border under html[data-ft-topbar-style="text-only"] so it
      // reads as bare icons next to the topbar's text links.
      data-ft-topbar-pill
      role="radiogroup"
      aria-label="Theme mode"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-pill border border-border bg-muted/70 p-0.5",
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
              // 40px segments on phones (track ≈ 46px, ui-law §7, §17.2),
              // compact from sm.
              "relative flex size-10 cursor-pointer items-center justify-center rounded-pill transition-colors sm:size-8",
              active
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active ? (
              <motion.span
                layoutId="active-mode-pill"
                transition={{ type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.25 }}
                className="absolute inset-0 rounded-pill brand-surface shadow-card"
              />
            ) : null}
            <Icon size={15} className="relative" />
          </button>
        );
      })}
    </div>
  );
}
