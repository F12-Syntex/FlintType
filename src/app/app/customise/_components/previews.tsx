import { cn } from "@/lib/utils";
import type { PreviewKind, Setting } from "./data";

const FRAME =
  "border border-ft-line-soft bg-ft-paper-2/40 px-4 py-3";

/** Dispatches the right small visual under each setting. Only settings
 *  whose effect is visual ship a preview — non-visual settings (e.g.
 *  "Repeated quotes") render no preview at all. */
export function Preview({
  kind,
  setting,
}: {
  kind: PreviewKind;
  setting: Setting;
}) {
  switch (kind) {
    case "wpm":
      return <WpmPreview on={setting.type === "toggle" ? setting.value : true} />;
    case "accuracy":
      return <AccuracyPreview on={setting.type === "toggle" ? setting.value : true} />;
    case "keyboard":
      return <KeyboardPreview on={setting.type === "toggle" ? setting.value : true} />;
    case "restart-hint":
      return <RestartHintPreview on={setting.type === "toggle" ? setting.value : true} />;
    case "error-stop":
      return <ErrorStopPreview on={setting.type === "toggle" ? setting.value : false} />;
    case "caret":
      return <CaretPreview value={setting.type === "select" ? setting.value : "line"} />;
    case "theme":
      return <ThemePreview value={setting.type === "select" ? setting.value : "paper"} />;
    case "difficulty":
      return <DifficultyPreview value={setting.type === "select" ? setting.value : "normal"} />;
    case "min-word-length":
      return <MinWordLengthPreview value={setting.type === "slider" ? setting.value : 3} />;
    case "confidence":
      return <ConfidencePreview value={setting.type === "select" ? setting.value : "off"} />;
  }
}

function WpmPreview({ on }: { on: boolean }) {
  return (
    <div className={FRAME}>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] tracking-[0.18em] text-ft-dim">WPM</span>
        {on ? (
          <span className="text-2xl font-semibold tabular-nums text-ft-ink">
            92
          </span>
        ) : (
          <span className="text-[10px] tabular-nums text-ft-dim/60">
            hidden
          </span>
        )}
      </div>
    </div>
  );
}

function AccuracyPreview({ on }: { on: boolean }) {
  return (
    <div className={FRAME}>
      <div className="flex items-baseline gap-2">
        <span className="text-[9px] tracking-[0.18em] text-ft-dim">ACC</span>
        {on ? (
          <span className="text-2xl font-semibold tabular-nums text-ft-ink">
            97.2<span className="text-base text-ft-dim">%</span>
          </span>
        ) : (
          <span className="text-[10px] tabular-nums text-ft-dim/60">
            hidden
          </span>
        )}
      </div>
    </div>
  );
}

function KeyboardPreview({ on }: { on: boolean }) {
  if (!on) {
    return (
      <div className={cn(FRAME, "text-[10px] tracking-[0.16em] text-ft-dim/60")}>
        keyboard hidden during run
      </div>
    );
  }
  // Mini representation: three rows of small keycaps with one lit on home row.
  const rows = [
    Array(11).fill(false),
    Array(10).fill(false).map((_, i) => i === 3),
    Array(9).fill(false),
  ];
  return (
    <div className={cn(FRAME, "flex flex-col items-center gap-1")}>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1" style={{ paddingLeft: i * 6 }}>
          {row.map((lit, j) => (
            <span
              key={j}
              className={cn(
                "h-2.5 w-2.5 rounded-sm",
                lit ? "bg-ft-ember" : "bg-ft-dim/50",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function RestartHintPreview({ on }: { on: boolean }) {
  return (
    <div className={FRAME}>
      {on ? (
        <span className="inline-flex items-center gap-2 text-[10px] tracking-[0.14em] text-ft-dim-2">
          <kbd className="border border-ft-line-soft bg-white px-1.5 py-0.5 text-[9px] font-semibold text-ft-ink">
            TAB
          </kbd>
          to restart
        </span>
      ) : (
        <span className="text-[10px] tracking-[0.14em] text-ft-dim/60">
          tab does nothing
        </span>
      )}
    </div>
  );
}

function ErrorStopPreview({ on }: { on: boolean }) {
  return (
    <div className={FRAME}>
      <p className="text-[15px] leading-snug text-ft-dim">
        the quick{" "}
        <span className="text-ft-ink">brow</span>
        <span
          className={cn(
            "underline decoration-1 underline-offset-4",
            on ? "text-ft-ember decoration-ft-ember" : "text-ft-ink/70",
          )}
        >
          x
        </span>
        {on ? (
          <span className="ml-2 text-[10px] uppercase tracking-[0.16em] text-ft-ember">
            ↩ blocked
          </span>
        ) : (
          <span className="text-ft-dim"> n fox</span>
        )}
      </p>
    </div>
  );
}

const CARET_GLYPH: Record<string, React.ReactNode> = {
  line: <span className="inline-block h-[18px] w-0.5 bg-ft-ember" />,
  block: <span className="inline-block h-[18px] w-2.5 bg-ft-ember" />,
  under: (
    <span className="mt-[14px] inline-block h-0.5 w-3 bg-ft-ember" />
  ),
  outline: (
    <span className="inline-block h-[18px] w-2.5 border border-ft-ember" />
  ),
  off: <span className="text-[10px] text-ft-dim">none</span>,
};

function CaretPreview({ value }: { value: string }) {
  return (
    <div className={cn(FRAME, "flex items-center gap-3")}>
      <span className="text-[11px] text-ft-ink">
        the la
        <span className="inline-flex h-[18px] items-center align-text-bottom">
          {CARET_GLYPH[value] ?? CARET_GLYPH.line}
        </span>
        zy dog
      </span>
    </div>
  );
}

const THEME_SWATCHES: Record<
  string,
  { bg: string; fg: string; ac: string }
> = {
  paper: { bg: "#F4F1EA", fg: "#0E0E0C", ac: "#E5532A" },
  ember: { bg: "#0E0E0C", fg: "#F4F1EA", ac: "#E5532A" },
  ice: { bg: "#F0F4F8", fg: "#1E3A5F", ac: "#3B82F6" },
  fog: { bg: "#D5D2CC", fg: "#1F1F22", ac: "#5A6A8A" },
  graphite: { bg: "#2A2A2A", fg: "#E0E0E0", ac: "#FF9A4A" },
};

function ThemePreview({ value }: { value: string }) {
  const t = THEME_SWATCHES[value] ?? THEME_SWATCHES.paper!;
  return (
    <div
      className="flex items-center justify-between gap-3 border border-ft-line-soft px-4 py-3"
      style={{ background: t.bg }}
    >
      <span
        className="text-[11px] tracking-[0.16em] uppercase"
        style={{ color: t.fg }}
      >
        the quick brown fox
      </span>
      <div className="flex gap-1.5">
        <span
          aria-hidden
          className="size-3"
          style={{ background: t.fg }}
        />
        <span
          aria-hidden
          className="size-3"
          style={{ background: t.ac }}
        />
      </div>
    </div>
  );
}

const DIFFICULTY_SAMPLES: Record<string, string> = {
  easy: "the cat sat on the mat",
  normal: "the quick brown fox jumps over",
  expert: "Although the syntax was deprecated, refactoring took 47 days",
  master: "ℵ-ℜ ⟨φ‧ψ⟩ ≡ ∂λ/∂t · 𝒪(n²)",
};

function DifficultyPreview({ value }: { value: string }) {
  return (
    <div className={cn(FRAME, "text-[12px] text-ft-ink")}>
      {DIFFICULTY_SAMPLES[value] ?? DIFFICULTY_SAMPLES.normal}
    </div>
  );
}

function MinWordLengthPreview({ value }: { value: number }) {
  const words = ["a", "is", "the", "fox", "lazy", "quick", "jumping", "syntactic"];
  return (
    <div className={cn(FRAME, "flex flex-wrap gap-x-2 gap-y-1 text-[12px]")}>
      {words.map((w) => (
        <span
          key={w}
          className={cn(
            w.length >= value ? "text-ft-ink" : "text-ft-dim/40 line-through",
          )}
        >
          {w}
        </span>
      ))}
    </div>
  );
}

function ConfidencePreview({ value }: { value: string }) {
  const labels: Record<string, string> = {
    off: "Backspace works normally",
    word: "Backspace blocked across word boundaries",
    all: "Backspace fully disabled · no take-backs",
  };
  return (
    <div className={cn(FRAME, "flex items-center gap-2")}>
      <kbd
        className={cn(
          "border px-2 py-0.5 text-[9px] font-semibold",
          value === "off"
            ? "border-ft-line-soft bg-white text-ft-ink"
            : "border-ft-ember bg-ft-ember/10 text-ft-ember line-through",
        )}
      >
        ⌫ BACKSPACE
      </kbd>
      <span className="text-[10px] tracking-[0.06em] text-ft-dim-2">
        {labels[value] ?? labels.off}
      </span>
    </div>
  );
}
