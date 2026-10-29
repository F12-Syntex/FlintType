import type { State } from "./practice-reducer";

/** Runs abandoned since the last submit (spec-20 §5.3): a restart mid-
 *  run or a sudden-death bounce. The next submitted run sends the count
 *  as its `resetCount`, and the tally starts over after every submit.
 *
 *  The tally belongs to one kind of test (mode, length and the adapt
 *  pref, which picks the stored mode), so restarts of one kind are never
 *  charged to another: abandoning a run of another kind starts the
 *  tally over, and a submitted run of another kind sends 0. Abandoned
 *  runs themselves are never submitted. */
export type AbandonTally = { kind: string; n: number };

/** No runs abandoned: the start, and the tally after every submit. */
export const NO_ABANDONS: AbandonTally = { kind: "", n: 0 };

type RunKind = Pick<State, "mode" | "length" | "adapt">;

function kindOf(s: RunKind): string {
  return `${s.mode}|${s.length}|${s.adapt}`;
}

/** The tally after the run in `s` is abandoned. Only a run that could
 *  have been submitted counts: one in progress with at least one key,
 *  and never BURST (its runs are never submitted, so its restarts would
 *  otherwise pile onto the next test). */
export function countAbandon(t: AbandonTally, s: RunKind & Pick<State, "phase" | "events">): AbandonTally {
  if (s.phase !== "running" || s.events.length === 0 || s.mode === "BURST") return t;
  const kind = kindOf(s);
  return { kind, n: kind === t.kind ? t.n + 1 : 1 };
}

/** The submitted run's `resetCount`: the tally when it is for the same
 *  kind of test, else 0. */
export function resetCountFor(t: AbandonTally, s: RunKind): number {
  return t.kind === kindOf(s) ? t.n : 0;
}
