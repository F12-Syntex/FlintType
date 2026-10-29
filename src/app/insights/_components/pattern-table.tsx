import type { CSSProperties } from "react";
import type { PatternRow } from "@/types/insights";
import { EXTRA_HEADER, extraLabel, MEASURED_HEADER } from "./labels-copy";
import { keyColumnWidths } from "./pattern-width";

const COUNT = new Intl.NumberFormat("en-GB");

/** One practice list as a table: the pattern, its extra time each time
 *  you type it (an ink bar scaled to the list's largest, and the
 *  figure), and how many times it was measured. Bars are data, so ink.
 *  On phones the figure sits over its bar, so the key column keeps the
 *  room to show each word whole; wider screens take a longer word whole
 *  too (pattern-width.ts). */
export function PatternTable({ rows, keyHeader, caption }: { rows: PatternRow[]; keyHeader: string; caption: string }) {
  const max = Math.max(1, ...rows.map((r) => r.extraMs));
  const key = keyColumnWidths(rows);
  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">{caption}</caption>
      <colgroup>
        <col
          className="w-(--key-w) sm:w-(--key-w-wide) lg:w-(--key-w-two-up) xl:w-(--key-w-wide)"
          style={{ "--key-w": key.phone, "--key-w-wide": key.wide, "--key-w-two-up": key.twoUp } as CSSProperties}
        />
        <col />
        <col className="w-[4.75rem] sm:w-[7.5rem]" />
      </colgroup>
      <thead>
        <tr className="border-b border-border/70">
          <th scope="col" className="pb-2 pr-3 text-xs font-medium text-muted-foreground">
            {keyHeader}
          </th>
          <th scope="col" className="px-3 pb-2 text-xs font-medium text-muted-foreground">
            {EXTRA_HEADER}
          </th>
          <th scope="col" className="pb-2 pl-3 text-right text-xs font-medium text-muted-foreground">
            {MEASURED_HEADER}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/70">
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row" className="py-2.5 pr-3 font-mono text-sm font-normal [overflow-wrap:anywhere] text-foreground">
              {r.key}
            </th>
            <td className="px-3 py-2.5">
              <span className="flex flex-col-reverse gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                <span aria-hidden className="relative h-2 min-w-0 sm:flex-1">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground/45"
                    style={{ width: `${Math.max(4, (r.extraMs / max) * 100)}%` }}
                  />
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{extraLabel(r.extraMs)}</span>
              </span>
            </td>
            <td className="py-2.5 pl-3 text-right text-sm tabular-nums text-muted-foreground">{COUNT.format(r.samples)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
