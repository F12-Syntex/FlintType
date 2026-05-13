"use client";

import { RacePassage } from "./passage";

/** Race surface — every mode is a passage race, so this is currently
 *  a one-line wrapper. Kept as its own module so the race page tree
 *  has a clear "surface" component to mount and any future per-mode
 *  routing can land here without touching the page. */
export function RaceSurface() {
  return <RacePassage />;
}
