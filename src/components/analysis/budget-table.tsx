import { SLICE_CLAUSE, SLICE_LABEL, secShort } from "@/lib/format-figure";
import { cn } from "@/lib/utils";
import type { SliceKey } from "@/types/typing-analysis";
import { sliceFill } from "./budget-segments";

type BudgetTableProps = {
  /** One row per slice, in `SLICE_ORDER`; `values` are seconds (a
   *  minute's or the test's), one per column. */
  rows: { key: SliceKey; values: number[] }[];
  /** Column headings ("Recently", "Better days", "This test"). */
  columns: string[];
  /** The slice the page's action addresses: its swatch is orange. */
  focus?: SliceKey | null;
  unit: "perMinute" | "seconds";
  /** From `breakClause(breakMs)` and `fixingClause(fixMode)`. */
  breakClause: string;
  fixingClause: string;
  /** Show each row's clause (default); `false` keeps it for screen readers only. */
  clauses?: boolean;
  className?: string;
};

/** The table twin of `<MinuteBar>`: one row per slice with its swatch,
 *  label and clause, and the seconds in tabular figures. It is the
 *  accessible version of the bar and is always visible. */
export function BudgetTable({
  rows,
  columns,
  focus = null,
  unit,
  breakClause,
  fixingClause,
  clauses = true,
  className,
}: BudgetTableProps) {
  const clauseFor = (key: SliceKey) =>
    key === "breaks" ? breakClause : key === "fixing" ? fixingClause : SLICE_CLAUSE[key];

  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      <caption className="sr-only">
        {unit === "perMinute" ? "Seconds per minute" : "Seconds in this test"}
      </caption>
      <thead>
        <tr className="border-b border-border/70">
          <th scope="col" className="pb-2 pr-3 text-xs font-medium text-muted-foreground">
            <span className="sr-only">Part of the time</span>
          </th>
          {columns.map((c) => (
            <th
              key={c}
              scope="col"
              className="pb-2 pl-3 text-right text-xs font-medium whitespace-nowrap text-muted-foreground"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row" className="py-2.5 pr-3 align-top font-normal">
              <span className="flex items-start gap-2.5">
                <span
                  aria-hidden
                  className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", sliceFill(row.key, focus))}
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm text-foreground">{SLICE_LABEL[row.key]}</span>
                  <span className={clauses ? "text-xs text-muted-foreground" : "sr-only"}>
                    {clauseFor(row.key)}
                  </span>
                </span>
              </span>
            </th>
            {row.values.map((v, i) => (
              <td
                key={columns[i] ?? i}
                className="py-2.5 pl-3 text-right align-top text-sm font-semibold whitespace-nowrap tabular-nums text-foreground"
              >
                {secShort(v * 1000)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
