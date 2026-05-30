import type { AiCurrentState, AppearancePatch } from "@/types/appearance-ai";

/** Accumulate refinements: later changes win, but earlier ones survive on
 *  untouched keys — so "warmer" then "bigger caret" keeps both. */
export function mergePatch(
  a: AppearancePatch,
  b: AppearancePatch,
): AppearancePatch {
  return {
    theme: { ...a.theme, ...b.theme },
    appearance: { ...a.appearance, ...b.appearance },
    background: { ...a.background, ...b.background },
  };
}

/** Overlay a pending (previewed-but-unapplied) patch onto the current-state
 *  snapshot, so the next AI request reasons from what's on screen, not the
 *  saved settings — that's what makes repeated refinement build up. */
export function overlayCurrent(
  current: AiCurrentState,
  patch: AppearancePatch,
): NonNullable<AiCurrentState> {
  return {
    theme: { ...(current?.theme ?? {}), ...patch.theme },
    appearance: { ...(current?.appearance ?? {}), ...patch.appearance },
    background: { ...(current?.background ?? {}), ...patch.background },
  };
}
