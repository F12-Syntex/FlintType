"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const LINES = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "sphinx of black quartz, judge my vow",
];

export function TypingAreaPreview() {
  return (
    <PreviewFrame>
      <div className="relative h-[120px] w-full max-w-md overflow-hidden font-mono text-base text-muted-foreground">
        <motion.div
          className="flex flex-col gap-2"
          animate={{ y: [0, -28, -56, -84, 0] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.25, 0.5, 0.75, 1],
          }}
        >
          {LINES.map((line, i) => (
            <p key={i} className="whitespace-nowrap">
              {line}
            </p>
          ))}
          <p className="whitespace-nowrap">{LINES[0]}</p>
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-card to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent" />
      </div>
    </PreviewFrame>
  );
}
