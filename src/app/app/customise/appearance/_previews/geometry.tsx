"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const STEPS = [
  { radius: 0, label: "Sharp" },
  { radius: 6, label: "Soft" },
  { radius: 14, label: "Round" },
  { radius: 28, label: "Pill" },
];

export function GeometryPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-5">
        <motion.div
          className="h-20 w-32 border border-primary bg-primary/15"
          animate={{
            borderRadius: STEPS.map((s) => `${s.radius}px`).concat(`${STEPS[0].radius}px`),
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.33, 0.66, 0.85, 1],
          }}
        />
        <div className="flex gap-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {STEPS.map((s, i) => (
            <motion.span
              key={s.label}
              animate={{
                color: [
                  "var(--muted-foreground)",
                  "var(--primary)",
                  "var(--muted-foreground)",
                ],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
                times: [
                  i * 0.25,
                  i * 0.25 + 0.06,
                  Math.min(1, i * 0.25 + 0.18),
                ],
              }}
            >
              {s.label}
            </motion.span>
          ))}
        </div>
      </div>
    </PreviewFrame>
  );
}
