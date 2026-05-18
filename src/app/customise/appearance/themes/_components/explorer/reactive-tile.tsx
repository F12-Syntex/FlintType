import { cn } from "@/lib/utils";
import { TileShell } from "./tile-shell";

/** Reactive — wildcard tile rendered in the same shape as a static
 *  theme but painted from a synthetic gradient sample. Mirrors the
 *  three-band layout of ThemeTile (display + palette, passage,
 *  mini keyboard) so it reads as a peer rather than a different
 *  card kind. */
export function ReactiveTile({
  active,
  onPick,
}: {
  active: boolean;
  onPick: () => void;
}) {
  const grad =
    "linear-gradient(135deg, oklch(0.62 0.22 35) 0%, oklch(0.55 0.22 60) 35%, oklch(0.40 0.18 280) 100%)";

  return (
    <TileShell
      active={active}
      onPick={onPick}
      ariaLabel="Apply background-reactive theme"
      name="Reactive"
      accentName
    >
      <div
        className="flex aspect-[5/4] flex-col gap-3 px-4 pt-3.5 pb-4 text-white"
        style={{ background: grad }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span
              className="leading-none"
              style={{
                fontSize: "30px",
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              Aa
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.18em] text-white/60"
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              Sampled
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-[3px]" aria-hidden>
            <span className="block size-3 rounded-sm bg-white/95" />
            <span className="block size-3 rounded-sm bg-white/65" />
            <span className="block size-3 rounded-sm bg-white/40" />
            <span className="block size-3 rounded-sm bg-white/20" />
          </div>
        </div>

        <p
          className="leading-snug"
          style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace" }}
        >
          <span className="text-white">the qu</span>
          <span
            aria-hidden
            className="inline-block align-baseline bg-white"
            style={{
              width: "1px",
              height: "12px",
              marginLeft: "-1px",
              marginRight: "-1px",
              borderRadius: "1px",
              transform: "translateY(2px)",
            }}
          />
          <span className="text-white/60">
            ick brown fox jumps over the&nbsp;
          </span>
          <span className="border-b border-white text-white">lazy</span>
          <span className="text-white/60"> dog.</span>
        </p>

        <div className="mt-auto flex justify-center">
          <ReactiveKeyboard />
        </div>
      </div>
    </TileShell>
  );
}

const ROWS: readonly (readonly string[])[] = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
];

/** Static rendering of the same 2-row letter sample as MiniKeyboard,
 *  but painted in the wildcard tile's gradient idiom — translucent
 *  white keys, no peg highlight, no design variant. Keeps the three
 *  bands of ReactiveTile composed the same way as ThemeTile. */
function ReactiveKeyboard() {
  return (
    <div className="flex flex-col gap-[2px]">
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          className="flex justify-center gap-[2px]"
          style={ri === 1 ? { paddingLeft: "10px" } : undefined}
        >
          {row.map((ch) => (
            <span
              key={ch}
              className={cn(
                "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm",
                "border border-white/30 bg-white/10 text-[8px] font-semibold leading-none text-white/90",
              )}
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              {ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
