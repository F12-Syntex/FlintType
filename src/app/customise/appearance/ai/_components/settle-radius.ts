import type { AppearancePatch } from "@/types/appearance-ai";
import {
  radiusWrite,
  remOf,
} from "../../../_components/rows/radius-presets";

/** The active palette's corners, as the manual Corners row reads them
 *  (`radius-presets.ts`): the radius it paints with no override, and the
 *  `--radius` its own presets write, if any. */
export type PaletteRadius = {
  paletteRem: number;
  baselineOverride: string | undefined;
};

/** The AI patch with its corner pick settled against the active palette,
 *  the same way picking it in Settings → Interface → Corners would be.
 *  A pick the palette already gives drops out of the theme writes and
 *  comes back as `clearRadius`, so applying it removes any override
 *  instead of writing a redundant one (which forked Default to Custom
 *  and showed "Reset (1)" for a no-op). Any other pick is written as the
 *  row would write it. A patch without a readable `--radius` is returned
 *  unchanged (same reference). */
export function settleRadius(
  patch: AppearancePatch,
  palette: PaletteRadius,
): { patch: AppearancePatch; clearRadius: boolean } {
  const rem = remOf(patch.theme["--radius"]);
  if (rem === undefined) return { patch, clearRadius: false };
  const write = radiusWrite(rem, palette);
  const theme = { ...patch.theme };
  if (write.kind === "clear") {
    delete theme["--radius"];
    return { patch: { ...patch, theme }, clearRadius: true };
  }
  if (write.value === patch.theme["--radius"]) {
    return { patch, clearRadius: false };
  }
  theme["--radius"] = write.value;
  return { patch: { ...patch, theme }, clearRadius: false };
}
