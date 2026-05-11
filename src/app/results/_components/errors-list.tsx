const ERRORS = [
  { word: "speed", kind: "mistype", detail: 'typed "speeed"', time: "0:08" },
  {
    word: "recovery",
    kind: "reset",
    detail: 'backspaced 2× to fix "v"',
    time: "0:14",
  },
  {
    word: "mistakes",
    kind: "mistype",
    detail: 'typed "mitsakes"',
    time: "0:22",
  },
];

export function ErrorsList() {
  return (
    <div className="flex flex-col">
      {ERRORS.map((e, i) => (
        <div
          key={i}
          className="grid grid-cols-1 gap-1 border-b border-ft-line-soft py-3.5 text-sm sm:grid-cols-[1fr_1fr_60px] sm:gap-4 sm:items-baseline"
        >
          <div>
            <span className="border-b border-ft-ember text-sm font-semibold text-ft-ember">
              {e.word}
            </span>
            <span className="ml-2.5 text-[10px] uppercase tracking-[0.16em] text-ft-dim">
              {e.kind}
            </span>
          </div>
          <span className="text-xs text-ft-dim-2">{e.detail}</span>
          <span className="text-right text-[11px] tabular-nums text-ft-dim">
            {e.time}
          </span>
        </div>
      ))}
    </div>
  );
}
