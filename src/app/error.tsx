"use client";

import { useEffect } from "react";
import { FtButton, Kbd, Logo, Tag } from "@/components/ft";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console so you still get the trace in dev.
    // (Next.js also reports it to the server logs in production.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-ft-paper text-ft-ink">
      <header className="flex h-14 shrink-0 items-center border-b border-ft-line-soft px-5 sm:px-7">
        <Logo />
      </header>

      <main className="flex flex-1 items-center px-5 py-16 sm:px-14 sm:py-24">
        <div className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Left — title + copy + actions */}
          <div className="flex flex-col gap-7">
            <div className="flex items-center gap-3">
              <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
              <Tag>ERR · RUN CRASHED</Tag>
            </div>

            <h1 className="text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] text-ft-ink sm:text-6xl lg:text-7xl">
              This page<br />
              couldn&apos;t load
              <span className="text-ft-ember">.</span>
            </h1>

            <p className="max-w-md text-base leading-relaxed text-ft-dim-2">
              Reload to try again, or go back.
            </p>

            <div className="flex flex-wrap gap-3">
              <FtButton variant="ember" size="lg" onClick={() => reset()}>
                RELOAD →
              </FtButton>
              <FtButton
                variant="ghost"
                size="lg"
                onClick={() => {
                  if (
                    typeof window !== "undefined" &&
                    window.history.length > 1
                  ) {
                    window.history.back();
                  } else {
                    window.location.href = "/";
                  }
                }}
              >
                ← BACK
              </FtButton>
            </div>
          </div>

          {/* Right — fake "run crashed" run-report panel */}
          <aside className="flex flex-col border border-ft-line-soft bg-[#FAF7F0] p-6 sm:p-8">
            <div className="mb-5 flex items-baseline justify-between">
              <Tag tone="ink">RUN CRASHED</Tag>
              <Tag tone="ember">● HALTED 0:00</Tag>
            </div>
            <p className="text-xl leading-[1.7] text-ft-dim sm:text-2xl">
              <span className="text-ft-ink">something</span>{" "}
              <span className="border-b border-ft-ember pb-0.5 text-ft-ember">
                broke
              </span>{" "}
              <span className="relative">
                <span className="text-ft-ink">midru</span>
                <span
                  className="mx-px inline-block h-[1.05em] w-0.5 align-text-bottom bg-ft-ember"
                  style={{ animation: "ft-blink 1s steps(2) infinite" }}
                  aria-hidden
                />
                <span>n</span>
              </span>
            </p>
            <div className="mt-7 grid grid-cols-3 gap-4 border-t border-ft-line-soft pt-5 text-center">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ft-dim">
                  WPM
                </span>
                <span className="text-2xl font-bold tabular-nums tracking-tight text-ft-ink">
                  —
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ft-dim">
                  ACC
                </span>
                <span className="text-2xl font-bold tabular-nums tracking-tight text-ft-ink">
                  —
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ft-dim">
                  STATUS
                </span>
                <span className="text-2xl font-bold tabular-nums tracking-tight text-ft-ember">
                  ERR
                </span>
              </div>
            </div>
            {error.digest ? (
              <div className="mt-5 border-t border-ft-line-soft pt-4 text-[10px] uppercase tracking-[0.16em] text-ft-dim">
                <span>incident ref · </span>
                <span className="text-ft-dim-2 normal-case tabular-nums">
                  {error.digest}
                </span>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <footer className="border-t border-ft-line-soft px-5 py-5 sm:px-14">
        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] uppercase tracking-[0.16em] text-ft-dim">
          <span>
            tip: press <Kbd>R</Kbd> to retry · <Kbd>esc</Kbd> to go back
          </span>
          <span className="text-ft-dim-2">STRIKE · SPARK · SHARPEN</span>
        </div>
      </footer>
    </div>
  );
}
