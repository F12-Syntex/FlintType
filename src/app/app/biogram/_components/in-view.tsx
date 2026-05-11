"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** One-shot fade-up reveal driven by IntersectionObserver. Collapses
 *  to a static frame under prefers-reduced-motion. The wrapper is a
 *  block by default — pass `className` to alter. */
export function InView({
  children,
  delayMs = 0,
  className,
}: {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            obs.disconnect();
            return;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: shown ? `${delayMs}ms` : "0ms" }}
      className={cn(
        "transition-[opacity,transform] duration-[700ms]",
        // Custom physics curve — the project's only sanctioned non-default ease.
        "ease-[cubic-bezier(0.22,1,0.36,1)]",
        "motion-reduce:transition-none motion-reduce:transform-none motion-reduce:opacity-100",
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
