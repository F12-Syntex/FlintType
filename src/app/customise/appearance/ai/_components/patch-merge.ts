import type { AiCurrentState, AppearancePatch } from "@/types/appearance-ai";

export const EMPTY_PATCH: AppearancePatch = {
  theme: {},
  appearance: {},
  background: {},
  behaviour: {},
};

export function isEmptyPatch(p: AppearancePatch): boolean {
  return (
    Object.keys(p.theme).length +
      Object.keys(p.appearance).length +
      Object.keys(p.background).length +
      Object.keys(p.behaviour).length ===
    0
  );
}

/** Accumulate refinements onto the preview patch — later changes win. */
export function mergePatch(a: AppearancePatch, b: AppearancePatch): AppearancePatch {
  return {
    theme: { ...a.theme, ...b.theme },
    appearance: { ...a.appearance, ...b.appearance },
    background: { ...a.background, ...b.background },
    behaviour: { ...a.behaviour, ...b.behaviour },
  };
}

/** Overlay the pending preview patch onto the current snapshot so the next
 *  AI request reasons from what's on the previews, letting refinements
 *  build up. */
export function overlayCurrent(
  current: AiCurrentState,
  patch: AppearancePatch,
): NonNullable<AiCurrentState> {
  return {
    theme: { ...(current?.theme ?? {}), ...patch.theme },
    appearance: { ...(current?.appearance ?? {}), ...patch.appearance },
    background: { ...(current?.background ?? {}), ...patch.background },
    behaviour: { ...(current?.behaviour ?? {}), ...patch.behaviour },
  };
}
