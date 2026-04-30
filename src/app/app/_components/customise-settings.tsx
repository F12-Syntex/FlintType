import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-7 items-center border p-px",
        on ? "border-ft-ember bg-ft-ember" : "border-ft-dim bg-transparent",
      )}
    >
      <span
        className={cn(
          "size-2.5 transition-transform",
          on ? "translate-x-3.5 bg-white" : "translate-x-0 bg-ft-dim",
        )}
      />
    </span>
  );
}

function Select({
  value,
  options,
}: {
  value: string;
  options: string[];
}) {
  return (
    <div className="flex flex-wrap gap-0.5">
      {options.map((o) => (
        <span
          key={o}
          className={cn(
            "border px-2 py-1 text-[9px] uppercase tracking-[0.1em]",
            o === value
              ? "border-ft-ink bg-ft-ink text-ft-paper"
              : "border-ft-line-soft bg-transparent text-ft-dim-2",
          )}
        >
          {o}
        </span>
      ))}
    </div>
  );
}

function Slider({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex w-36 items-center gap-2.5">
      <div className="relative h-1 flex-1 bg-ft-line-soft">
        <div
          className="absolute top-0 bottom-0 left-0 bg-ft-ember"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute -top-1 size-2.5 bg-ft-ember"
          style={{ left: `calc(${pct}% - 5px)` }}
        />
      </div>
      <span className="min-w-4 text-right text-[11px] tabular-nums text-ft-ink">
        {value}
      </span>
    </div>
  );
}

function Setting({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-3.5 border-b border-ft-line-soft py-3">
      <div>
        <div className="text-[11px] font-semibold tracking-[0.1em] text-ft-ink">
          {label}
        </div>
        {desc ? (
          <div className="mt-0.5 text-[10px] leading-snug text-ft-dim-2">
            {desc}
          </div>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function CustomiseSettings() {
  return (
    <aside className="overflow-y-auto px-5 py-6 sm:px-8">
      <Tag tone="ink" className="mb-3.5 block">
        BEHAVIOUR · 14 SETTINGS
      </Tag>

      <Setting
        label="QUICK RESTART"
        desc="Press tab to restart instantly without losing focus"
      >
        <Toggle on />
      </Setting>
      <Setting
        label="LIVE WPM"
        desc="Show WPM ticker during run (off = MonkeyType-pure mode)"
      >
        <Toggle on />
      </Setting>
      <Setting label="LIVE ACCURACY" desc="Show accuracy %">
        <Toggle on />
      </Setting>
      <Setting label="LIVE KEYBOARD" desc="Show keyboard visualization during run">
        <Toggle on />
      </Setting>
      <Setting label="STOP ON ERROR" desc="Won't advance until typo is corrected">
        <Toggle on={false} />
      </Setting>
      <Setting
        label="CONFIDENCE MODE"
        desc="Disable backspace entirely · go faster, accept what you get"
      >
        <Select value="off" options={["off", "word", "all"]} />
      </Setting>
      <Setting label="MIN WORD LENGTH" desc="Filter out short words from word lists">
        <Slider value={3} min={1} max={8} />
      </Setting>
      <Setting label="DIFFICULTY">
        <Select
          value="normal"
          options={["easy", "normal", "expert", "master"]}
        />
      </Setting>
      <Setting label="SHOW SECONDARY" desc="Numbers & punctuation in word mode">
        <Toggle on />
      </Setting>
      <Setting label="LAZY MODE" desc="Replace fancy unicode chars with ASCII">
        <Toggle on={false} />
      </Setting>
      <Setting label="START ON KEY" desc="Which key actually starts the timer">
        <Select
          value="first-keystroke"
          options={["first-keystroke", "first-correct", "space"]}
        />
      </Setting>
      <Setting label="REPEATED QUOTES" desc="Allow same quote twice in a row">
        <Toggle on={false} />
      </Setting>
      <Setting
        label="BLIND MODE"
        desc="Hide all live signal · type without seeing what you typed"
      >
        <Toggle on={false} />
      </Setting>
      <Setting label="STRICT SPACE" desc="Must press space at word end · no skipping">
        <Toggle on />
      </Setting>

      <div className="mt-6 bg-ft-ink p-4 text-[11px] leading-relaxed text-ft-paper">
        <div className="mb-2 text-[9px] tracking-[0.18em] text-ft-ember">
          POWER USER
        </div>
        All 86 settings are TOML-backed. Edit{" "}
        <span className="bg-[#221F1A] px-1.5 py-px">~/.flinttype/config.toml</span>{" "}
        directly, or sync via dotfiles.
      </div>
    </aside>
  );
}
