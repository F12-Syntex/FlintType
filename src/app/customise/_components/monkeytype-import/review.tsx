import { FileJson } from "lucide-react";
import { leftOutLines, reviewLead, settingsCount } from "./copy";
import type { MtPlan } from "./types";

/** The review before anything is written: every setting that will
 *  change, grouped the way the settings pages group them, with its new
 *  value, and a line on what stays out. */
export function ImportReview({ plan, fileName }: { plan: MtPlan; fileName: string }) {
  const leftOut = leftOutLines(plan);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="inline-flex max-w-full items-center gap-1.5 self-start rounded-pill bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          <FileJson aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate">{fileName}</span>
        </p>
        <p className="text-sm text-foreground">
          {reviewLead(plan)} Everything else stays as it is.
        </p>
      </div>

      {plan.groups.map((group) => (
        <section key={group.id} aria-labelledby={`mt-group-${group.id}`} className="flex flex-col gap-2">
          <h3
            id={`mt-group-${group.id}`}
            className="flex items-baseline justify-between gap-3 text-sm font-semibold text-foreground"
          >
            {group.title}
            <span className="text-xs font-normal tabular-nums text-muted-foreground">
              {settingsCount(group.rows.length)}
            </span>
          </h3>
          <dl className="divide-y divide-border/70 rounded-xl border border-border bg-card">
            {group.rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 px-3 py-2.5 text-sm">
                <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 truncate text-right font-medium tabular-nums text-foreground" title={row.value}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {leftOut.length > 0 ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{leftOut.join(" ")}</p>
      ) : null}
    </div>
  );
}
