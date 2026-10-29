import type { SubmitTestInput } from "@/types/adapt";
import type { RunInput } from "@/types/typing-analysis";

/** The server's view of a submitted run, for analyseRun. Null when the
 *  payload has no length unit (old clients, the race and drill paths
 *  that never sent one). The client builds the same RunInput from its
 *  State (`stateToRunInput`), so both sides analyse the same run (I2);
 *  `typedFinal` and `partial` are client-only and omitted here. */
export function submitToRunInput(input: SubmitTestInput): RunInput | null {
  if (input.lengthMode === undefined) return null;
  return {
    timings: input.timings,
    edits: input.edits,
    spaces: input.spaces,
    words: input.words,
    durationMs: input.completedAt - input.startedAt,
    wpm: input.wpm,
    lengthMode: input.lengthMode,
    ctx: input.ctx,
  };
}
