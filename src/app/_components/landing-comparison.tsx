import { Tag } from "@/components/ft";

const ROWS: [string, string, string, string, string][] = [
  ["Clean typing test", "✓", "—", "✓", "✓"],
  ["Real-time races", "—", "✓", "✓", "—"],
  ["Per-keystroke analysis", "—", "—", "✓", "partial"],
  ["Adaptive drills targeting your weaknesses", "—", "—", "✓", "✓"],
  ["Burst ceiling diagnosis", "—", "—", "✓", "—"],
  ["Letter-pair latency map", "—", "—", "✓", "partial"],
  ["Free, no progress gates", "✓", "—", "✓", "—"],
  ["Open source", "✓", "—", "✓", "—"],
];

export function ComparisonTable() {
  return (
    <section className="px-5 pb-20 sm:px-20 sm:pb-30">
      <div className="mb-10 flex flex-wrap items-baseline gap-4 sm:mb-14">
        <Tag>§ 03</Tag>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[44px]">
          What&apos;s different.
        </h2>
      </div>
      <div className="-mx-5 overflow-x-auto sm:mx-0">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-t border-b border-ft-ink">
              <th className="p-4 text-left text-[10px] font-semibold tracking-[0.18em] uppercase" />
              <th className="p-4 text-left text-[10px] font-semibold tracking-[0.18em] text-ft-dim-2 uppercase">
                MONKEYTYPE
              </th>
              <th className="p-4 text-left text-[10px] font-semibold tracking-[0.18em] text-ft-dim-2 uppercase">
                TYPERACER
              </th>
              <th className="border-x border-ft-ember p-4 text-left text-[10px] font-semibold tracking-[0.18em] text-ft-ember uppercase">
                FLINTTYPE
              </th>
              <th className="p-4 text-left text-[10px] font-semibold tracking-[0.18em] text-ft-dim-2 uppercase">
                KEYBR
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} className="border-b border-ft-line-soft">
                <td className="p-4 font-medium text-ft-ink">{row[0]}</td>
                <td className="p-4 tabular-nums text-ft-dim-2">{row[1]}</td>
                <td className="p-4 tabular-nums text-ft-dim-2">{row[2]}</td>
                <td className="border-x border-ft-ember bg-ft-ember/[0.06] p-4 font-semibold tabular-nums text-ft-ember">
                  {row[3]}
                </td>
                <td className="p-4 tabular-nums text-ft-dim-2">{row[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
