import { ChevronDown } from "lucide-react";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { speed } from "@/lib/format-figure";
import { rowNote, rowWhen, TABLE_SUMMARY, tableCaption, tableHeaders, type TrendView } from "./trend-copy";
import { tableRows, type TrendRow } from "./trend-data";

const TH = "pb-2 text-xs font-medium text-muted-foreground";
const TD = "py-2 text-sm tabular-nums";

/** The chart's table twin (spec-40 §3.5): the newest 30 points on show,
 *  newest first. When Adapt speeds are adjusted for passage difficulty,
 *  Speed is the adjusted figure and Typed speed the one you typed. In
 *  the daily view each row is a day (the middle of its tests), and a
 *  personal best keeps a row of its own, marked under its date. */
export function TrendTable({ rows, unit, view }: { rows: TrendRow[]; unit: TypingSpeedUnit; view: TrendView }) {
  const shown = tableRows(rows);
  const headers = tableHeaders(view);
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/60 focus-visible:outline-solid sm:min-h-0 [&::-webkit-details-marker]:hidden">
        {TABLE_SUMMARY}
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left">
          <caption className="sr-only">{tableCaption(view)}</caption>
          <thead>
            <tr className="border-b border-border/70">
              <th scope="col" className={`${TH} pr-3`}>
                {headers.date}
              </th>
              <th scope="col" className={`${TH} px-3 text-right`}>
                {headers.speed}
              </th>
              {view.adjusted ? (
                <th scope="col" className={`${TH} px-3 text-right`}>
                  {headers.typed}
                </th>
              ) : null}
              <th scope="col" className={`${TH} pl-3 text-right`}>
                {headers.accuracy}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {shown.map((r, i) => {
              const note = rowNote(r, view);
              return (
                <tr key={`${r.t}-${i}`}>
                  <th scope="row" className={`${TD} pr-3 text-left font-normal text-muted-foreground`}>
                    <span className="block whitespace-nowrap">{rowWhen(r, view)}</span>
                    {note ? <span className="block text-xs text-foreground">{note}</span> : null}
                  </th>
                  <td className={`${TD} px-3 text-right font-semibold text-foreground`}>{speed(r.valueWpm, unit)}</td>
                  {view.adjusted ? (
                    <td className={`${TD} px-3 text-right text-foreground`}>{speed(r.typedWpm, unit)}</td>
                  ) : null}
                  <td className={`${TD} pl-3 text-right text-foreground`}>{Math.round(r.acc)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </details>
  );
}
