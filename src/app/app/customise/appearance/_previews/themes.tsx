"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const PALETTES: ReadonlyArray<{ name: string; colors: readonly string[] }> = [
  {
    name: "Default",
    colors: [
      "oklch(0.6551 0.2312 34.7438)",
      "oklch(0.9450 0.0180 85)",
      "oklch(0.9650 0.0150 85)",
      "oklch(0.9656 0.0176 39.4009)",
    ],
  },
  {
    name: "Kodama Grove",
    colors: ["#876C50", "#E4D7B5", "#F5E9D0", "#A6CFE0"],
  },
  {
    name: "Cyberpunk",
    colors: ["#FF2A6D", "#0D0F18", "#1A1F2E", "#05D9E8"],
  },
  {
    name: "Catppuccin",
    colors: ["#CBA6F7", "#1E1E2E", "#181825", "#F5C2E7"],
  },
];

export function ThemesPreview() {
  return (
    <PreviewFrame>
      <div className="flex w-full max-w-md flex-col gap-3">
        {PALETTES.map((p, i) => (
          <motion.div
            key={p.name}
            className="flex items-center gap-3"
            initial={{ opacity: 0.4, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.6,
              delay: i * 0.18,
              repeat: Infinity,
              repeatType: "reverse",
              repeatDelay: 2.6,
            }}
          >
            <span className="w-24 shrink-0 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {p.name}
            </span>
            <div className="flex flex-1 gap-1.5">
              {p.colors.map((c, ci) => (
                <span
                  key={ci}
                  className="h-6 flex-1 rounded-sm border border-foreground/10"
                  style={{ background: c }}
                />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </PreviewFrame>
  );
}
