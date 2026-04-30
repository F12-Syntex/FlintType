import { FtButton, Tag } from "@/components/ft";

export function ResultsHeader() {
  return (
    <header className="border-b border-ft-line-soft px-5 pt-10 pb-7 sm:px-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
            <Tag>RUN REPORT · #1042 · 14:22 TODAY</Tag>
          </div>
          <h1 className="text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
            92<span className="font-normal text-ft-dim"> wpm </span>
            <span className="block text-base font-semibold text-ft-ember sm:inline sm:text-xl lg:text-2xl">
              ↑ +6 over your 30-day average
            </span>
          </h1>
          <p className="mt-3.5 max-w-2xl text-sm leading-relaxed text-ft-dim-2">
            You broke 95 WPM in two bursts but lost{" "}
            <span className="font-semibold text-ft-ink">3.4 seconds</span> on
            three recurring stalls. Drilling them next run could push your
            average past <span className="text-ft-ember">96</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FtButton variant="ghost" size="sm">EXPORT</FtButton>
          <FtButton variant="ghost" size="sm">SHARE</FtButton>
          <FtButton variant="ember" size="sm">DRILL THE STALLS →</FtButton>
        </div>
      </div>
    </header>
  );
}
