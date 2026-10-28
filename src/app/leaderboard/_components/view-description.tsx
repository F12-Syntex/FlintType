"use client";

import { useSearchParams } from "next/navigation";
import { parseView, VIEW_DESCRIPTIONS } from "./filters";

/** The page header's one line, matched to the active view. The server
 *  renders the Best runs line as the Suspense fallback. */
export function ViewDescription() {
  const view = parseView(useSearchParams().get("view"));
  return <>{VIEW_DESCRIPTIONS[view]}</>;
}
