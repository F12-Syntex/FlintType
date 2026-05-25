"use client";

import { Keyboard } from "@/app/_components/keyboard";
import { Passage } from "@/app/_components/passage";
import { MobileReadouts } from "@/app/_components/readouts";
import { cn } from "@/lib/utils";
import { PreviewPracticeProvider } from "./preview-practice";

/** The single live preview of the real practice surface (ui-law.md
 *  §12.5). It mounts the *exact* components that run on /app — Passage,
 *  the live-stats Readouts, the Keyboard widget — inside a frozen,
 *  read-only practice context. Every appearance / behaviour pref the
 *  components already read (theme, colours, caret, typography, tape,
 *  surface, live-stats, keyboard, mistakes) repaints the moment the
 *  user changes it, so this decisively shows how a choice will render,
 *  with zero parallel rendering logic to drift.
 *
 *  Placed twice by `customise/layout.tsx`: a sticky right rail on
 *  desktop (`compact={false}` — taller passage + the keyboard) and a
 *  sticky strip atop the content scroller on mobile (`compact` — short
 *  passage, no keyboard, so it doesn't eat the small viewport). The
 *  narrow column uses the compact pip-row readouts either way. */
export function LivePreview({ compact = false }: { compact?: boolean }) {
  return (
    <PreviewPracticeProvider>
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center gap-2.5">
          <span aria-hidden className="inline-block h-px w-4 bg-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live preview
          </span>
        </div>
        <div className="flex flex-col gap-3 rounded-md border border-border bg-card px-3 py-3">
          <MobileReadouts />
          <div className={cn("relative w-full", compact ? "h-[96px]" : "h-[184px]")}>
            <Passage />
          </div>
          {!compact ? (
            <div className="-mx-1 overflow-x-auto">
              <Keyboard />
            </div>
          ) : null}
        </div>
      </div>
    </PreviewPracticeProvider>
  );
}
