"use client";

import type { ReactNode } from "react";

/** Shared preview frame so every Appearance sub-page card reads the
 *  same height, padding, and background. The previews themselves are
 *  small composed scenes — each picks an `aspect` (default 16:9-ish)
 *  via `min-h`. The frame keeps them on a uniform aesthetic strip. */
export function PreviewFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex min-h-[180px] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-background to-card px-6 py-8 ${className}`}
    >
      {children}
    </div>
  );
}
