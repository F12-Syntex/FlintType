"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const FACES = [
  { stack: `'JetBrains Mono', ui-monospace, monospace`, label: "JetBrains Mono" },
  { stack: `'IBM Plex Mono', ui-monospace, monospace`, label: "IBM Plex Mono" },
  { stack: `'Fira Code', ui-monospace, monospace`, label: "Fira Code" },
  { stack: `'Source Code Pro', ui-monospace, monospace`, label: "Source Code Pro" },
];

export function TypographyPreview() {
  return (
    <PreviewFrame>
      <div className="flex w-full max-w-md flex-col items-center gap-4">
        {FACES.map((f, i) => (
          <motion.div
            key={f.label}
            className="flex w-full items-baseline justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.5, 1],
              delay: i * 0.6,
            }}
          >
            <span
              className="text-xl tracking-tight"
              style={{ fontFamily: f.stack }}
            >
              the quick brown fox
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {f.label}
            </span>
          </motion.div>
        ))}
      </div>
    </PreviewFrame>
  );
}
