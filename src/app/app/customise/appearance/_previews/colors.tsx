"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const SWATCHES = [
  "var(--primary)",
  "var(--accent)",
  "var(--muted)",
  "var(--card)",
  "var(--foreground)",
];

export function ColorsPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-5">
        <div className="flex gap-2">
          {SWATCHES.map((c, i) => (
            <motion.span
              key={c}
              className="block h-12 w-12 rounded-md border border-foreground/10"
              style={{ background: c }}
              animate={{
                scale: [1, 1.12, 1],
                y: [0, -4, 0],
              }}
              transition={{
                duration: 2.4,
                delay: i * 0.16,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <motion.div
          className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span>primary</span>
          <span className="text-foreground/30">·</span>
          <span>accent</span>
          <span className="text-foreground/30">·</span>
          <span>muted</span>
          <span className="text-foreground/30">·</span>
          <span>card</span>
          <span className="text-foreground/30">·</span>
          <span>fg</span>
        </motion.div>
      </div>
    </PreviewFrame>
  );
}
