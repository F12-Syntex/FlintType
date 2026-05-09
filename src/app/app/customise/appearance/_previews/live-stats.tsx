"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect } from "react";
import { PreviewFrame } from "./frame";

export function LiveStatsPreview() {
  const wpm = useMotionValue(0);
  const acc = useMotionValue(100);
  const wpmText = useTransform(wpm, (v) => Math.round(v).toString());
  const accText = useTransform(acc, (v) => `${v.toFixed(1)}%`);

  useEffect(() => {
    const w = animate(wpm, [0, 92, 110, 84, 96, 0], {
      duration: 7,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.25, 0.5, 0.7, 0.9, 1],
    });
    const a = animate(acc, [100, 98.4, 99.1, 95.6, 97.8, 100], {
      duration: 7,
      repeat: Infinity,
      ease: "easeInOut",
      times: [0, 0.25, 0.5, 0.7, 0.9, 1],
    });
    return () => {
      w.stop();
      a.stop();
    };
  }, [wpm, acc]);

  return (
    <PreviewFrame>
      <div className="flex items-end gap-10 font-mono">
        <Stat label="WPM">
          <motion.span className="tabular-nums">{wpmText}</motion.span>
        </Stat>
        <Stat label="Accuracy">
          <motion.span className="tabular-nums">{accText}</motion.span>
        </Stat>
      </div>
    </PreviewFrame>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      <span className="text-4xl font-bold tracking-[-0.04em] text-primary">
        {children}
      </span>
    </div>
  );
}
