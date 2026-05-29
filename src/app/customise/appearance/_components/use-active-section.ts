"use client";

import { useEffect, useState } from "react";
import { APPEARANCE_SECTIONS } from "../_sections";

/** Track which `<section id>` is currently visible inside the customise
 *  scroller so chrome (the sidebar rail, the persistent preview pane) can
 *  follow along. The customise layout uses a custom scroller (the inner
 *  `<div className="absolute inset-0 overflow-y-auto">`) rather than the
 *  window, so we observe with IntersectionObserver against the document —
 *  the threshold band trips as a section moves through view and we pick
 *  the one with the largest visible share.
 *
 *  Extracted from the sidebar so the preview pane reads the same active
 *  section without a second observer drifting out of sync (organization
 *  rule: a symbol imported from ≥ 2 places earns its own file). */
export function useActiveAppearanceSection(active: boolean): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setActiveId(null);
      return;
    }
    const ids = APPEARANCE_SECTIONS.map((s) => s.id);
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    // Track ratios across all sections; pick the one with the largest
    // visible share. Plain "first intersecting" is wrong because two
    // sections often overlap the threshold band when one is partly
    // scrolled past.
    const ratios = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target.id, e.intersectionRatio);
        }
        let bestId: string | null = null;
        let bestRatio = 0;
        for (const id of ids) {
          const r = ratios.get(id) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestId = id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const t of targets) obs.observe(t);
    return () => obs.disconnect();
  }, [active]);

  return activeId;
}
