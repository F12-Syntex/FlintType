"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const ROW3 = ["z", "x", "c", "v", "b", "n", "m"];
const SEQUENCE = ["t", "h", "e", "q", "u", "i", "c", "k"];

/** Each key animates through the typing sequence — when SEQUENCE[i]
 *  matches the key's char, the key flashes primary; otherwise it stays
 *  neutral. Single shared timeline so the whole keyboard reads as one
 *  word being typed across the surface. */
function AnimatedKey({ char }: { char: string }) {
  return (
    <motion.span
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-sm border border-foreground/15 bg-background px-1.5 font-mono text-[11px] text-muted-foreground"
      animate={{
        backgroundColor: SEQUENCE.map((s) =>
          s === char ? "var(--primary)" : "var(--background)",
        ),
        color: SEQUENCE.map((s) =>
          s === char ? "var(--primary-foreground)" : "var(--muted-foreground)",
        ),
      }}
      transition={{
        duration: SEQUENCE.length * 0.42,
        repeat: Infinity,
        ease: "linear",
        times: SEQUENCE.map((_, i) => i / SEQUENCE.length),
      }}
    >
      {char}
    </motion.span>
  );
}

export function KeyboardPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-1.5">
        {[ROW1, ROW2, ROW3].map((row, ri) => (
          <div
            key={ri}
            className="flex gap-1.5"
            style={{ paddingLeft: `${ri * 8}px` }}
          >
            {row.map((c) => (
              <AnimatedKey key={c} char={c} />
            ))}
          </div>
        ))}
      </div>
    </PreviewFrame>
  );
}
