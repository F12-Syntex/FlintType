"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

/** Heatmap intensity per key — pretend frequency / accuracy. Values 0..1. */
const HEAT: Record<string, number> = {
  q: 0.18, w: 0.42, e: 0.86, r: 0.62, t: 0.78, y: 0.34, u: 0.55, i: 0.74, o: 0.61, p: 0.32,
  a: 0.71, s: 0.66, d: 0.59, f: 0.82, g: 0.28, h: 0.48, j: 0.21, k: 0.39, l: 0.52,
  z: 0.12, x: 0.16, c: 0.44, v: 0.26, b: 0.31, n: 0.57, m: 0.41,
};

export function KeymapPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-1.5">
        {[ROW1, ROW2, ROW3].map((row, ri) => (
          <div
            key={ri}
            className="flex gap-1.5"
            style={{ paddingLeft: `${ri * 8}px` }}
          >
            {row.map((c, i) => {
              const heat = HEAT[c] ?? 0.2;
              return (
                <motion.span
                  key={c}
                  className="inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-foreground/10 px-1.5 font-mono text-[11px] text-foreground/70"
                  initial={{ backgroundColor: "var(--card)" }}
                  animate={{
                    backgroundColor: [
                      "var(--card)",
                      `color-mix(in oklab, var(--primary) ${(heat * 100).toFixed(0)}%, var(--card))`,
                      "var(--card)",
                    ],
                  }}
                  transition={{
                    duration: 4,
                    delay: (ri * 0.08) + (i * 0.04),
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  {c}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}
