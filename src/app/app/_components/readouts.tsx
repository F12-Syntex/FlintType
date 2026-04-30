import { Stat } from "@/components/ft";

export function Readouts({
  active,
  cursorWord,
}: {
  active: boolean;
  cursorWord: number;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat label="WPM" value={active ? "92" : "—"} accent={active} />
        <Stat label="ACC" value={active ? "97.2%" : "—"} />
        <Stat label="PEAK" value={active ? "118" : "—"} />
      </div>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Stat
          label="WORD"
          value={active ? `${cursorWord}/30` : "0/30"}
          align="right"
        />
        <Stat
          label="ELAPSED"
          value={active ? "0:18" : "0:00"}
          align="right"
        />
      </div>
    </div>
  );
}
