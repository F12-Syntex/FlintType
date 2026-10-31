import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { notImportedCount } from "@/lib/settings-import/plan";
import type { ImportGroup, ImportSource, SettingsTally, SkippedItem, SkipReason } from "@/types/settings-import";
import type { InputKind } from "./import-copy";
import { matchesSummary, REASON_HEADINGS, restLine, skippedSummary } from "./review-copy";

const REASONS: readonly SkipReason[] = ["bad-value", "own-way", "not-in-flinttype", "unrecognised"];

function Disclosure({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-pill text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/60 sm:min-h-9 [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown aria-hidden className="size-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="pt-1 pb-2">{children}</div>
    </details>
  );
}

/** Under the review list: what already matches, and what isn't imported
 *  and why. Each is hidden when empty. For a MonkeyType file, one muted
 *  line counts the rest of its settings (at its defaults, or with no
 *  setting here) out of all `settingsInFile`, inside the not-imported
 *  list or on its own. */
export function ReviewExtras({
  groups,
  skipped,
  source,
  tally,
  settingsInFile,
  inputKind,
}: {
  groups: readonly ImportGroup[];
  skipped: readonly SkippedItem[];
  source: ImportSource;
  tally?: SettingsTally;
  settingsInFile: number;
  inputKind: InputKind;
}) {
  const same = groups.flatMap((g) => g.unchanged.filter((i) => !i.hidden).map((i) => ({ item: i, group: g.name })));
  const skippedCount = notImportedCount(skipped);
  const rest =
    tally && tally.rest > 0 ? (
      <p className="text-xs text-muted-foreground">{restLine(tally.rest, settingsInFile, inputKind)}</p>
    ) : null;
  return (
    <div className="mt-3 flex flex-col">
      {same.length > 0 ? (
        <Disclosure summary={matchesSummary(same.length)}>
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[60%]" />
              <col className="w-[40%]" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="pr-3 pb-1.5 font-medium">Setting</th>
                <th scope="col" className="pb-1.5 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {same.map(({ item, group }) => (
                <tr key={item.id}>
                  <th scope="row" className="py-2 pr-3 text-left align-top font-normal text-foreground">
                    {item.label}
                    <span className="block text-xs text-muted-foreground">{group}</span>
                  </th>
                  <td className="py-2 align-top text-muted-foreground tabular-nums [overflow-wrap:anywhere]">{item.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Disclosure>
      ) : null}
      {skipped.length > 0 ? (
        <Disclosure summary={skippedSummary(skippedCount, source)}>
          <div className="flex flex-col gap-4">
            {REASONS.map((reason) => {
              const list = skipped.filter((s) => s.reason === reason);
              if (list.length === 0) return null;
              return (
                <section key={reason}>
                  <h4 className="text-xs font-medium text-muted-foreground">{REASON_HEADINGS[reason]}</h4>
                  <ul className="mt-1.5 flex flex-col gap-2 text-sm">
                    {list.map((s) => (
                      <li key={s.key}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 text-foreground [overflow-wrap:anywhere]">{s.label}</span>
                          {s.value ? (
                            <span className="max-w-[50%] shrink-0 truncate text-muted-foreground tabular-nums">{s.value}</span>
                          ) : null}
                        </div>
                        {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
            {rest}
          </div>
        </Disclosure>
      ) : (
        rest && <div className="py-2">{rest}</div>
      )}
    </div>
  );
}
