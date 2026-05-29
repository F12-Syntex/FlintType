"use client";

import type { ReactNode } from "react";
import { Passage } from "@/app/_components/passage";
import { Readouts } from "@/app/_components/readouts";
import { findAppearanceSection } from "../_sections";
import { PreviewPracticeProvider } from "../../_components/preview-practice";
import {
  BackgroundPreview,
  CaretPreview,
  ChromePreview,
  ColorPreview,
  GeometryPreview,
  KeyboardLivePreview,
  KeymapLivePreview,
  LiveStatsPreview,
  MistakesPreview,
  MultiplayerPreview,
  ResultLivePreview,
  SurfacePreview,
  TapePreview,
  ThemePreview,
  TypingAreaPreview,
  TypographyPreview,
} from "./section-previews";

/** One persistent preview that follows whichever section is in view —
 *  the real practice components, read-only, repainting 1:1 with the live
 *  prefs (ui-law §12.5). Most sections share the practice surface; the
 *  ones the passage can't depict (result, keymap, multiplayer) render
 *  their own faithful composition. */
const SECTION_PREVIEWS: Record<string, () => ReactNode> = {
  themes: ThemePreview,
  colors: ColorPreview,
  geometry: GeometryPreview,
  surface: SurfacePreview,
  chrome: ChromePreview,
  caret: CaretPreview,
  mistakes: MistakesPreview,
  typography: TypographyPreview,
  keyboard: KeyboardLivePreview,
  background: BackgroundPreview,
  "live-stats": LiveStatsPreview,
  "typing-area": TypingAreaPreview,
  tape: TapePreview,
  result: ResultLivePreview,
  keymap: KeymapLivePreview,
  multiplayer: MultiplayerPreview,
};

/** Fallback before any section is tracked: the typing surface itself. */
function DefaultPreview() {
  return (
    <div className="pointer-events-none select-none px-4 py-5 sm:px-6 sm:py-6">
      <PreviewPracticeProvider phase="running" cursorChar={11}>
        <div className="flex flex-col gap-4">
          <Readouts />
          <Passage />
        </div>
      </PreviewPracticeProvider>
    </div>
  );
}

export function PreviewPane({
  activeId,
  changed,
  customizedCount,
}: {
  activeId: string | null;
  changed: Record<string, boolean>;
  customizedCount: number;
}) {
  const Preview = (activeId && SECTION_PREVIEWS[activeId]) || DefaultPreview;
  const section = activeId ? findAppearanceSection(activeId) : null;
  const label = section?.name ?? "Your typing surface";
  const sectionChanged = activeId ? Boolean(changed[activeId]) : false;
  const customised = customizedCount > 0;

  return (
    <div className="flex max-h-[46vh] flex-col overflow-hidden rounded-md border border-border bg-background xl:max-h-[calc(100dvh-6rem)]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Live preview
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold tracking-tight text-foreground">
            {label}
            {sectionChanged ? (
              <span
                aria-label="Changed from default"
                title="Changed from default"
                className="inline-block size-1.5 shrink-0 rounded-full bg-primary"
              />
            ) : null}
          </span>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-live="off">
        <Preview />
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-4 py-2.5">
        <span className="flex items-center gap-2">
          <span
            className={
              "font-mono text-lg font-bold tabular-nums leading-none " +
              (customised ? "text-primary" : "text-foreground/40")
            }
          >
            {customizedCount}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {customised ? "changed" : "untouched"}
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-primary"
          />
          marks edits
        </span>
      </footer>
    </div>
  );
}
