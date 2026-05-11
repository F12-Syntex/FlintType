import { cn } from "@/lib/utils";

const FEED = [
  { t: "0:14", who: "@damiel", ev: "crossed 90% · likely winner", accent: true },
  { t: "0:12", who: "@selan", ev: "broke 140 wpm burst" },
  { t: "0:11", who: "@you", ev: "hit personal pace · 92 wpm" },
  { t: "0:09", who: "@kassia", ev: "reset on \"another\"" },
  { t: "0:08", who: "@damiel", ev: "pulled ahead · +18 word lead", accent: true },
  { t: "0:05", who: "@you", ev: "overtook your ghost" },
  { t: "0:00", who: "race", ev: "4 racers · GO" },
];

const STAKES = [
  { label: "WIN ELO", value: "+24", accent: true },
  { label: "2ND", value: "+8" },
  { label: "3RD", value: "−4", muted: true },
  { label: "LAST", value: "−18", accent: true },
];

const MODES = [
  { name: "1V1", detail: "matched by elo · short prose" },
  { name: "1V3 · LOBBY", detail: "4 racers · 50 words", active: true },
  { name: "BURST", detail: "one word, ten times" },
  { name: "SPRINT", detail: "15-second blitz" },
  { name: "ENDURANCE", detail: "500 words · stamina test" },
  { name: "GHOST", detail: "race your past self" },
];

const LADDER: [string, string, string, boolean?, boolean?][] = [
  ["1", "@damiel", "218 avg", true],
  ["2", "@kira", "194 avg"],
  ["3", "@aoife", "186 avg"],
  ["…", "…", ""],
  ["1,284", "@you", "92 avg", false, true],
];

function Section({
  title,
  rightHint,
  children,
}: {
  title: string;
  rightHint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ft-ink-line px-6 py-5">
      <div className="mb-3.5 flex justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-ft-paper">
          {title}
        </span>
        {rightHint ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-ft-warm-3">
            {rightHint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function RaceSidebar() {
  return (
    <aside className="flex flex-col border-t border-ft-ink-line lg:border-t-0 lg:border-l">
      <Section title="RACE FEED" rightHint="LIVE">
        <div className="flex flex-col gap-2.5">
          {FEED.map((e, i) => (
            <div
              key={i}
              className="grid grid-cols-[32px_1fr] items-baseline gap-2"
            >
              <span className="text-[10px] tabular-nums text-ft-warm-3">
                {e.t}
              </span>
              <div className="text-[11px] leading-snug">
                <span
                  className={cn(
                    "font-semibold",
                    e.accent ? "text-ft-ember" : "text-ft-warm-1",
                  )}
                >
                  {e.who}
                </span>{" "}
                <span className="text-ft-warm-1">{e.ev}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="STAKES">
        <div className="flex flex-col gap-2.5 text-[11px]">
          {STAKES.map((s) => (
            <div key={s.label} className="flex justify-between">
              <span className="text-ft-warm-2">{s.label}</span>
              <span
                className={cn(
                  "tabular-nums",
                  s.accent
                    ? "text-ft-ember"
                    : s.muted
                      ? "text-ft-warm-2"
                      : "text-ft-paper",
                )}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="RACE MODES">
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <div
              key={m.name}
              className={cn(
                "flex justify-between gap-3 border px-2 py-1.5",
                m.active
                  ? "border-ft-ember bg-ft-ember/[0.08]"
                  : "border-ft-ink-line",
              )}
            >
              <div>
                <div
                  className={cn(
                    "text-[11px] font-semibold",
                    m.active ? "text-ft-ember" : "text-ft-paper",
                  )}
                >
                  {m.name}
                </div>
                <div className="mt-0.5 text-[10px] text-ft-warm-2">
                  {m.detail}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="SEASON LEADERBOARD" rightHint="SEE ALL →">
        <div className="flex flex-col gap-1.5 text-[11px]">
          {LADDER.map((row, i) => (
            <div
              key={i}
              className={cn(
                "grid grid-cols-[50px_1fr_auto] gap-2 py-1",
                row[3] || row[4] ? "text-ft-ember" : "text-ft-warm-1",
              )}
            >
              <span className="tabular-nums">{row[0]}</span>
              <span className={row[4] ? "font-bold" : "font-medium"}>
                {row[1]}
              </span>
              <span className="tabular-nums text-ft-warm-2">{row[2]}</span>
            </div>
          ))}
        </div>
      </Section>
    </aside>
  );
}
