import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";

const CARETS = [
  { name: "LINE", active: true },
  { name: "BLOCK" },
  { name: "UNDER" },
  { name: "OUTLINE" },
  { name: "OFF" },
];

const THEMES = [
  { n: "PAPER", bg: "#F4F1EA", fg: "#0E0E0C", ac: "#E5532A", active: true },
  { n: "EMBER", bg: "#0E0E0C", fg: "#F4F1EA", ac: "#E5532A" },
  { n: "TERMINAL", bg: "#0A0F0A", fg: "#9AE89A", ac: "#FFC107" },
  { n: "ICE", bg: "#F0F4F8", fg: "#1E3A5F", ac: "#3B82F6" },
  { n: "BONE", bg: "#E8E3D5", fg: "#2A1F12", ac: "#9C5F2A" },
  { n: "BLOOD", bg: "#1A0908", fg: "#F4DCD0", ac: "#C73020" },
  { n: "FOG", bg: "#D5D2CC", fg: "#1F1F22", ac: "#5A6A8A" },
  { n: "DUSK", bg: "#1F1B2E", fg: "#E8DCEF", ac: "#D670B0" },
  { n: "COBALT", bg: "#0A1628", fg: "#D8E3F0", ac: "#3FA9F5" },
  { n: "PARCHMENT", bg: "#EFE5CD", fg: "#3A2A14", ac: "#8C4A1A" },
  { n: "GRAPHITE", bg: "#2A2A2A", fg: "#E0E0E0", ac: "#FF9A4A" },
  { n: "+ NEW", bg: "transparent", fg: "var(--color-ft-dim)", ac: "var(--color-ft-dim)", plus: true },
];

function CaretGlyph({ name }: { name: string }) {
  switch (name) {
    case "LINE":
      return <span className="inline-block h-[22px] w-0.5 bg-ft-ember" />;
    case "BLOCK":
      return <span className="inline-block h-[22px] w-3 bg-ft-ember" />;
    case "UNDER":
      return <span className="mt-[18px] inline-block h-0.5 w-3.5 bg-ft-ember" />;
    case "OUTLINE":
      return (
        <span className="inline-block h-[22px] w-3 border-[1.5px] border-ft-ember" />
      );
    case "OFF":
      return <span className="text-[10px] text-ft-dim">none</span>;
  }
  return null;
}

export function CustomisePreview() {
  return (
    <section className="overflow-hidden border-b border-ft-line-soft px-5 py-8 sm:px-10 lg:border-r lg:border-b-0">
      <div className="mb-6 flex items-baseline justify-between gap-2">
        <Tag>LIVE PREVIEW</Tag>
        <Tag tone="ember">● UPDATES AS YOU EDIT</Tag>
      </div>

      <div className="mb-6 bg-ft-paper-2 p-7">
        <div className="mb-4 flex flex-wrap justify-between gap-2 text-[10px] tracking-[0.16em] text-ft-dim">
          <span>WORDS · 50 · EN-COMMON</span>
          <span>92 WPM · 97.2%</span>
        </div>
        <p className="m-0 text-lg leading-[1.7] text-ft-dim sm:text-xl lg:text-[22px]">
          <span className="text-ft-ink">the quick brown fox jumps over the</span>{" "}
          <span className="relative">
            <span className="text-ft-ink">la</span>
            <span
              className="mx-px inline-block h-[1.05em] w-0.5 align-text-bottom bg-ft-ember"
              style={{ animation: "ft-blink 1s steps(2) infinite" }}
              aria-hidden
            />
            <span>zy dog and keeps on going</span>
          </span>
        </p>
      </div>

      <div className="mb-6">
        <Tag className="mb-2.5 block">CARET STYLES · 5 OPTIONS</Tag>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {CARETS.map((c) => (
            <div
              key={c.name}
              className={cn(
                "flex flex-col items-center gap-2 bg-white px-2.5 py-3.5",
                c.active
                  ? "border-[1.5px] border-ft-ember"
                  : "border border-ft-line-soft",
              )}
            >
              <div className="flex h-[22px] items-center">
                <CaretGlyph name={c.name} />
              </div>
              <span
                className={cn(
                  "text-[9px] tracking-[0.18em]",
                  c.active ? "text-ft-ember" : "text-ft-dim",
                )}
              >
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Tag className="mb-2.5 block">THEME · 14 BUILT-IN · 3 CUSTOM</Tag>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {THEMES.map((t) => (
            <div
              key={t.n}
              className={cn(
                "flex flex-col items-center gap-1.5 px-2 py-3.5",
                t.active
                  ? "border-[1.5px] border-ft-ember"
                  : t.plus
                    ? "border border-dashed border-ft-line-soft"
                    : "border border-ft-line-soft",
              )}
              style={{ background: t.bg }}
            >
              {t.plus ? (
                <span style={{ color: t.fg, fontSize: 16 }}>+</span>
              ) : (
                <div className="flex gap-[3px]">
                  <span
                    className="size-2.5"
                    style={{ background: t.fg }}
                    aria-hidden
                  />
                  <span
                    className="size-2.5"
                    style={{ background: t.ac }}
                    aria-hidden
                  />
                </div>
              )}
              <span
                className="text-[8px] tracking-[0.18em]"
                style={{ color: t.fg }}
              >
                {t.n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
