const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const HEAT: Record<string, number> = {
  t: 86, h: 78, o: 62, u: 58, e: 22, p: 12, b: 44, c: 30, m: 18, n: 8,
  r: 16, s: 12, i: 14, a: 6, l: 4, d: 8, f: 6, g: 10, j: 22, k: 18,
  q: 30, w: 12, y: 28, x: 8, z: 0, v: 6,
};
const MAX = 86;

export function KeyboardHeatmap() {
  return (
    <div className="flex flex-col gap-1.5 overflow-x-auto py-2.5">
      {ROWS.map((row, ri) => (
        <div
          key={ri}
          className="flex gap-1.5"
          style={{ paddingLeft: ri * 14 }}
        >
          {row.split("").map((k) => {
            const v = HEAT[k] || 0;
            const intensity = v / MAX;
            const isHot = intensity > 0.3;
            return (
              <div
                key={k}
                className="flex size-11 flex-col items-center justify-center border border-ft-line-soft text-[13px] font-semibold"
                style={{
                  background: isHot
                    ? `rgba(229,83,42,${0.1 + intensity * 0.7})`
                    : "#fff",
                  color: intensity > 0.6 ? "#fff" : "var(--color-ft-ink)",
                }}
              >
                <span>{k}</span>
                <span className="text-[8px] font-normal tabular-nums opacity-70">
                  +{v}
                </span>
              </div>
            );
          })}
        </div>
      ))}
      <div className="mt-3.5 flex items-center justify-between text-[9px] tracking-wider text-ft-dim">
        <span>0 MS</span>
        <div
          className="mx-3.5 h-1 flex-1 border border-ft-line-soft"
          style={{
            background: "linear-gradient(to right, #fff, var(--color-ft-ember))",
          }}
          aria-hidden
        />
        <span>+86 MS</span>
      </div>
    </div>
  );
}
