import Link from "next/link";
import { FtButton, Kbd, Logo, Tag } from "@/components/ft";
import { HideFriendsDock } from "@/app/_components/hide-friends-dock";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "404 — passage not found",
  description: "The route you tried doesn't exist on flinttype.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ft-paper text-ft-ink">
      <HideFriendsDock />
      <header className="flex h-14 shrink-0 items-center border-b border-ft-line-soft px-5 sm:px-7">
        <Logo />
      </header>

      <main className="flex flex-1 items-center px-5 py-16 sm:px-14 sm:py-24">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Left — title + copy + CTAs */}
          <div className="flex flex-col gap-7">
            <div className="flex items-center gap-3">
              <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
              <Tag>ERR 404 · PASSAGE NOT FOUND</Tag>
            </div>

            <h1 className="text-7xl font-extrabold leading-[0.92] tracking-[-0.04em] text-ft-ink sm:text-8xl lg:text-[160px]">
              404
              <span className="text-ft-ember">.</span>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-ft-dim-2">
              The flint hit empty air. The route you typed doesn&apos;t exist
              in this build, or it drifted somewhere we no longer track.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/">
                <FtButton variant="ember" size="lg">
                  BACK TO PRACTICE →
                </FtButton>
              </Link>
              <Link href="/">
                <FtButton variant="ghost" size="lg">
                  LANDING
                </FtButton>
              </Link>
            </div>
          </div>

          {/* Right — fake "run report" panel that reads as the broken state */}
          <aside className="flex flex-col border border-ft-line-soft bg-ft-paper-soft p-6 sm:p-8">
            <div className="mb-5 flex items-baseline justify-between">
              <Tag tone="ink">RUN ABORTED</Tag>
              <Tag tone="ember">● HALTED 0:00</Tag>
            </div>
            <p className="text-xl leading-[1.7] text-ft-dim sm:text-2xl">
              <span className="text-ft-ink">the page you</span>{" "}
              <span className="border-b border-ft-ember pb-0.5 text-ft-ember">
                requested
              </span>
              <span className="text-ft-ink"> doesn&apos;t</span>{" "}
              <span className="relative">
                <span className="text-ft-ink">ex</span>
                <span
                  className="mx-px inline-block h-[1.05em] w-0.5 align-text-bottom bg-ft-ember"
                  style={{ animation: "ft-blink 1s steps(2) infinite" }}
                  aria-hidden
                />
                <span>ist</span>
              </span>
            </p>
            <div className="mt-7 grid grid-cols-3 gap-4 border-t border-ft-line-soft pt-5 text-center">
              {[
                { label: "WPM", value: "—" },
                { label: "ACC", value: "0%" },
                { label: "STATUS", value: "404", accent: true },
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-ft-dim">
                    {s.label}
                  </span>
                  <span
                    className={`text-2xl font-bold tabular-nums tracking-tight ${
                      s.accent ? "text-ft-ember" : "text-ft-ink"
                    }`}
                  >
                    {s.value}
                  </span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-t border-ft-line-soft px-5 py-5 sm:px-14">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-ft-dim">
          <span>
            tip: press <Kbd>⌘</Kbd>+<Kbd>K</Kbd> to search routes
          </span>
          <span className="text-ft-dim-2">STRIKE · SPARK · SHARPEN</span>
        </div>
      </footer>
    </div>
  );
}
