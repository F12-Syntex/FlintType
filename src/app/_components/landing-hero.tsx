import Link from "next/link";
import { FtButton, Tag } from "@/components/ft";

export function Hero() {
  return (
    <section className="px-5 pt-20 pb-16 sm:px-20 sm:pt-30 sm:pb-25 lg:px-20 lg:pt-30 lg:pb-25">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-20">
        <div>
          <div className="mb-7 flex items-center gap-3">
            <span className="inline-block h-px w-10 bg-ft-ember" aria-hidden />
            <Tag>FILE №01 · A TYPING TRAINER</Tag>
          </div>
          <h1 className="text-5xl font-extrabold leading-[0.92] tracking-[-0.04em] text-ft-ink sm:text-7xl lg:text-[124px]">
            Type faster.
            <br />
            <span className="text-ft-dim">Understand</span>
            <br />
            <span>
              why you&apos;re{" "}
              <em className="border-b-4 border-ft-ember pb-0.5 not-italic text-ft-ember">
                stuck
              </em>
              .
            </span>
          </h1>
        </div>

        <div className="lg:pb-3">
          <p className="max-w-md text-base leading-relaxed text-ft-dim-2">
            Most typing tools tell you a number. Flinttype shows you the{" "}
            <span className="text-ft-ink">
              specific letter pairs, words, and bursts
            </span>{" "}
            holding you back — then drills you out of them.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/sign-up">
              <FtButton variant="ember" size="lg">
                START A TEST →
              </FtButton>
            </Link>
            <FtButton variant="ghost" size="lg">
              SEE A REPORT
            </FtButton>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-ft-dim">
            <span>NO ACCOUNT NEEDED</span>
            <span aria-hidden>·</span>
            <span>FREE FOREVER</span>
            <span aria-hidden>·</span>
            <span>OPEN SOURCE</span>
          </div>
        </div>
      </div>

      <div className="mt-16 hidden flex-wrap justify-between gap-4 border-t border-ft-line-soft pt-6 text-[10px] uppercase tracking-[0.16em] text-ft-dim md:flex">
        <span>EST. 2026</span>
        <span>BUILT FOR DEVS · WRITERS · STUDENTS</span>
        <span>40,283 RUNS LOGGED THIS WEEK</span>
        <span>50.4 BILLION KEYSTROKES ANALYSED</span>
        <span>CURRENT TOP: 218 WPM @damiel</span>
      </div>
    </section>
  );
}
