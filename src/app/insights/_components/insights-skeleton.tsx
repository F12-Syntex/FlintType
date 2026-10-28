import type { ReactNode } from "react";
import { Surface } from "@/components/page-shell";
import { TwoUp } from "./panel";

/** Loading placeholder shaped like the real page (Focus next rows,
 *  two weakness cards, chart + runs) so nothing jumps when data lands. */
export function InsightsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading your insights"
      className="flex flex-col gap-10 motion-safe:animate-pulse sm:gap-12"
    >
      <SectionBones>
        <Surface className="divide-y divide-border/70">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
              <span className="size-6 shrink-0 rounded-full bg-muted" />
              <div className="flex flex-1 flex-col gap-2">
                <span className="h-3.5 w-40 rounded-full bg-muted" />
                <span className="h-3 w-full max-w-md rounded-full bg-muted/70" />
              </div>
              <span className="hidden h-9 w-28 rounded-pill bg-muted sm:block" />
            </div>
          ))}
        </Surface>
      </SectionBones>
      <SectionBones>
        <TwoUp>
          {[0, 1].map((i) => (
            <CardBones key={i}>
              {Array.from({ length: 5 }, (_, r) => (
                <div key={r} className="flex items-center gap-3">
                  <span className="h-3 w-10 rounded-full bg-muted" />
                  <span
                    className="h-2 rounded-full bg-muted"
                    style={{ width: `${70 - r * 10}%` }}
                  />
                </div>
              ))}
            </CardBones>
          ))}
        </TwoUp>
      </SectionBones>
      <SectionBones>
        <TwoUp>
          <CardBones>
            <span className="h-44 w-full rounded-xl bg-muted/70 sm:h-52" />
          </CardBones>
          <CardBones>
            {Array.from({ length: 5 }, (_, r) => (
              <div key={r} className="flex items-center justify-between gap-3">
                <span className="h-3.5 w-32 rounded-full bg-muted" />
                <span className="h-4 w-10 rounded-full bg-muted" />
              </div>
            ))}
          </CardBones>
        </TwoUp>
      </SectionBones>
    </div>
  );
}

function SectionBones({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="h-5 w-32 rounded-full bg-muted" />
        <span className="h-3.5 w-56 rounded-full bg-muted/70" />
      </div>
      {children}
    </div>
  );
}

function CardBones({ children }: { children: ReactNode }) {
  return (
    <Surface className="flex flex-col gap-4 p-4 sm:p-5">
      <span className="h-4 w-24 rounded-full bg-muted" />
      {children}
    </Surface>
  );
}
