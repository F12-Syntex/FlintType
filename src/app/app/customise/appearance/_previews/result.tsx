"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

const POINTS = [38, 52, 64, 71, 78, 84, 88, 92, 95, 98, 96, 99, 102, 100, 98];
const W = 280;
const H = 90;
const STEP = W / (POINTS.length - 1);
const MAX = Math.max(...POINTS);
const path = POINTS.map(
  (p, i) => `${i === 0 ? "M" : "L"}${(i * STEP).toFixed(1)},${(H - (p / MAX) * H).toFixed(1)}`,
).join(" ");

export function ResultPreview() {
  return (
    <PreviewFrame>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-baseline gap-3 font-mono">
          <motion.span
            className="text-3xl font-bold tracking-[-0.04em] text-primary tabular-nums"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse", repeatDelay: 4 }}
          >
            98 wpm
          </motion.span>
          <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            96.4% acc
          </span>
        </div>
        <svg width={W} height={H} className="overflow-visible">
          <motion.path
            d={path}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 1] }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.6, 1],
            }}
          />
          <motion.circle
            r="3"
            fill="var(--primary)"
            initial={{ cx: 0, cy: H }}
            animate={{
              cx: POINTS.map((_, i) => i * STEP),
              cy: POINTS.map((p) => H - (p / MAX) * H),
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
              times: POINTS.map((_, i) => (i / (POINTS.length - 1)) * 0.6),
            }}
          />
        </svg>
      </div>
    </PreviewFrame>
  );
}
