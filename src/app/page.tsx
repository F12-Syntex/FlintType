import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FtButton, Tag } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { Hero } from "./_components/landing-hero";
import { DemoPanel } from "./_components/landing-demo";
import { LoopGrid } from "./_components/landing-loop";
import { ComparisonTable } from "./_components/landing-comparison";
import { Pricing } from "./_components/landing-pricing";

export const metadata = buildPageMetadata({
  title: "Type faster. Understand why you're stuck.",
  description:
    "flinttype — open-source typing trainer that diagnoses the specific letter pairs, words, and bursts holding you back, then drills you out of them.",
  path: "/",
});

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect("/app");

  return (
    <div className="min-h-screen bg-ft-paper text-ft-ink">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ft-line-soft px-5 py-4 sm:px-7">
        <div className="flex items-baseline gap-2 text-sm font-bold tracking-wide">
          <span className="inline-block size-2.5 rotate-45 bg-ft-ember" aria-hidden />
          <span className="tracking-[0.04em]">FLINTTYPE</span>
          <span className="hidden text-[11px] tracking-[0.06em] text-ft-dim sm:inline">
            v0.4 · OPEN SOURCE
          </span>
        </div>
        <nav className="hidden items-center gap-5 text-[11px] uppercase tracking-[0.14em] text-ft-dim-2 lg:flex">
          <a>WHY</a>
          <a>HOW IT WORKS</a>
          <a>RACES</a>
          <a>CHANGELOG</a>
          <a>GITHUB</a>
        </nav>
        <div className="flex shrink-0 gap-2">
          <Link href="/sign-in">
            <FtButton variant="ghost" size="sm">
              SIGN IN
            </FtButton>
          </Link>
          <Link href="/sign-up">
            <FtButton variant="ember" size="sm">
              START TYPING →
            </FtButton>
          </Link>
        </div>
      </header>

      <Hero />
      <DemoPanel />
      <LoopGrid />
      <ComparisonTable />
      <Pricing />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ft-ink px-5 py-8 text-[10px] uppercase tracking-[0.16em] text-ft-dim sm:px-20">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rotate-45 bg-ft-ember" aria-hidden />
          <span>FLINTTYPE © MMXXVI</span>
        </div>
        <div className="hidden gap-7 md:flex">
          <span>GITHUB</span>
          <span>DISCORD</span>
          <span>CHANGELOG</span>
          <span>STATUS</span>
          <span>PRIVACY</span>
        </div>
        <Tag>STRIKE · SPARK · SHARPEN</Tag>
      </footer>
    </div>
  );
}
