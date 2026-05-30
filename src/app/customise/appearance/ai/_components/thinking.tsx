"use client";

import { cn } from "@/lib/utils";

/** A quiet "the model is working" line. The label shimmers through the
 *  muted→ink ramp (the one sanctioned loader motion, §13), gated behind
 *  `motion-safe:` so reduced-motion users get a static muted label with
 *  a steady coral dot. No ambient glow, theme-token colours only. */
export function Thinking({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-primary motion-safe:animate-pulse"
      />
      <span className="ft-thinking text-[13px] font-medium tracking-tight text-muted-foreground motion-safe:bg-clip-text motion-safe:text-transparent">
        Designing your look
      </span>
      <style>{`
        @keyframes ftThinkingShimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        @media (prefers-reduced-motion: no-preference) {
          .ft-thinking {
            background-image: linear-gradient(
              90deg,
              var(--muted-foreground) 0%,
              var(--muted-foreground) 35%,
              var(--foreground) 50%,
              var(--muted-foreground) 65%,
              var(--muted-foreground) 100%
            );
            background-size: 200% auto;
            animation: ftThinkingShimmer 1.8s linear infinite;
          }
        }
      `}</style>
    </div>
  );
}
