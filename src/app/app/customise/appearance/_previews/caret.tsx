"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const TEXT = "the quick brown fox";

export function CaretPreview() {
  return (
    <PreviewFrame>
      <div className="font-mono text-2xl tracking-[-0.01em]">
        <span className="text-primary">the qui</span>
        <motion.span
          className="inline-block h-7 w-[3px] translate-y-1 bg-primary align-middle"
          animate={{ opacity: [1, 0.1, 1] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <span className="text-muted-foreground/60">{TEXT.slice(7)}</span>
      </div>
    </PreviewFrame>
  );
}
