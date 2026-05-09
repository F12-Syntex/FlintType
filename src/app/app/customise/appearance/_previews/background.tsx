"use client";

import { motion } from "framer-motion";
import { PreviewFrame } from "./frame";

export function BackgroundPreview() {
  return (
    <PreviewFrame className="bg-background">
      <motion.div
        aria-hidden
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(70% 60% at 20% 30%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
            "radial-gradient(70% 60% at 80% 30%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
            "radial-gradient(70% 60% at 80% 80%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
            "radial-gradient(70% 60% at 20% 80%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
            "radial-gradient(70% 60% at 20% 30%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute inset-0"
        animate={{
          background: [
            "radial-gradient(50% 50% at 70% 50%, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)",
            "radial-gradient(50% 50% at 30% 50%, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)",
            "radial-gradient(50% 50% at 70% 50%, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)",
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-2 text-center">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Reactive backdrop
        </span>
        <span className="font-mono text-base text-foreground">
          breathing radial gradient
        </span>
      </div>
    </PreviewFrame>
  );
}
