export type StepStatus = "waiting" | "active" | "done" | "failed";

export type StepTask = {
  id: string;
  run: () => unknown;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Run tasks one after another. Each stays active for at least `minMs`,
 *  so a list of instant writes still reads as one step after the next,
 *  and a slow task simply takes longer. Stops at the first failure and
 *  hands back its error. `isCurrent` lets a newer run cancel this one. */
export async function runSteps(
  tasks: readonly StepTask[],
  {
    minMs,
    onChange,
    isCurrent = () => true,
    wait = sleep,
  }: {
    minMs: number;
    onChange: (id: string, status: StepStatus) => void;
    isCurrent?: () => boolean;
    wait?: (ms: number) => Promise<void>;
  },
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  for (const task of tasks) {
    if (!isCurrent()) return { ok: false, error: new Error("cancelled") };
    onChange(task.id, "active");
    // A failing step also shows for minMs, so an error never flashes up
    // before the dialog has finished opening.
    const [outcome] = await Promise.allSettled([
      Promise.resolve().then(task.run),
      wait(minMs),
    ]);
    if (outcome.status === "rejected") {
      if (isCurrent()) onChange(task.id, "failed");
      return { ok: false, error: outcome.reason };
    }
    if (!isCurrent()) return { ok: false, error: new Error("cancelled") };
    onChange(task.id, "done");
  }
  return { ok: true };
}
