import { cn } from "@/lib/utils";

const SECTIONS = [
  { name: "BEHAVIOUR", n: 14, active: true },
  { name: "APPEARANCE", n: 22 },
  { name: "TYPOGRAPHY", n: 11 },
  { name: "CARET & CURSOR", n: 8 },
  { name: "SOUND", n: 9 },
  { name: "KEYMAP", n: 6 },
  { name: "ADAPTIVE", n: 12 },
  { name: "ACCESSIBILITY", n: 7 },
  { name: "KEYBOARD VIS", n: 9 },
  { name: "EXPERIMENTAL", n: 4 },
];

export function CustomiseNav() {
  return (
    <nav className="overflow-x-auto border-b border-ft-line-soft py-3 lg:border-r lg:border-b-0 lg:py-6">
      <ul className="flex gap-0 lg:flex-col">
        {SECTIONS.map((s) => (
          <li
            key={s.name}
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 border-l-2 px-5 py-2.5",
              s.active
                ? "border-ft-ember bg-ft-ember/[0.05]"
                : "border-transparent",
            )}
          >
            <span
              className={cn(
                "text-[11px] tracking-[0.14em]",
                s.active ? "font-semibold text-ft-ink" : "text-ft-dim-2",
              )}
            >
              {s.name}
            </span>
            <span className="text-[10px] tabular-nums text-ft-dim">{s.n}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
