import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

function ModeGroup({
  label,
  items,
  active,
}: {
  label: string;
  items: string[];
  active: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Tag>{label}</Tag>
      <div className="flex gap-0.5">
        {items.map((it) => (
          <span
            key={it}
            className={cn(
              "px-2 py-1 text-[11px] tracking-[0.1em] transition-colors",
              it === active
                ? "border border-ft-ink bg-ft-ink text-ft-paper"
                : "border border-transparent text-ft-dim-2 hover:border-ft-line-soft hover:bg-ft-paper hover:text-ft-ink",
            )}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-7 items-center border border-ft-ember p-px",
        on && "bg-ft-ember",
      )}
    >
      <span
        className={cn(
          "size-2.5 transition-transform",
          on ? "translate-x-3 bg-white" : "translate-x-0 bg-ft-ember",
        )}
      />
    </span>
  );
}

export function ModeBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-b border-ft-line-soft bg-ft-paper-2/45 px-5 py-4 sm:px-7">
      <ModeGroup label="MODE" items={["WORDS", "TIME", "QUOTE", "CODE"]} active="WORDS" />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <ModeGroup label="LENGTH" items={["25", "50", "100", "200"]} active="50" />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <ModeGroup
        label="LANG"
        items={["EN", "EN-COMMON", "PROGRAMMING"]}
        active="EN-COMMON"
      />
      <span aria-hidden className="hidden h-5 w-px bg-ft-line-soft md:inline" />
      <div className="flex items-center gap-2.5">
        <Tag>ADAPT</Tag>
        <Toggle on />
        <span className="text-[11px] tracking-wide text-ft-dim-2">
          · targeting{" "}
          <span className="font-semibold text-ft-ember">th, ou, sp</span>
        </span>
      </div>
    </div>
  );
}
