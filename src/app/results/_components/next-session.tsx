const DRILLS = [
  { name: "TH-DRILL · 50 words", detail: "th, the, that, then, them — dense" },
  { name: "OU-DRILL · 50 words", detail: "ou, our, out, your, hour" },
  { name: "BURST PUSH · 100 words", detail: "common-1k @ 110+ target" },
];

export function NextSession() {
  return (
    <div className="flex flex-col gap-3.5">
      <p className="m-0 text-[13px] leading-relaxed text-ft-dim-2">
        Three drills generated for your next session, targeting your slowest
        pairs and your 118 ceiling.
      </p>
      {DRILLS.map((d) => (
        <div
          key={d.name}
          className="flex items-center justify-between border border-ft-line-soft px-3.5 py-3"
        >
          <div>
            <div className="text-xs font-semibold">{d.name}</div>
            <div className="mt-0.5 text-[11px] text-ft-dim-2">{d.detail}</div>
          </div>
          <span className="text-[11px] tracking-[0.16em] text-ft-ember">
            RUN →
          </span>
        </div>
      ))}
    </div>
  );
}
