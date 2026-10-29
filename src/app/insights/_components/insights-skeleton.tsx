import type { ReactNode } from "react";
import { PageHeader, PageShell, Surface } from "@/components/page-shell";
import { PAGE_TITLE } from "./insights-copy";
import { LOADING_LABEL } from "./labels-copy";

/** Loading placeholder shaped like the page (spec-40 §4): the verdict
 *  card, one minute bar with its table, and three rows, so nothing jumps
 *  when the data lands. */
export function InsightsSkeleton() {
  return (
    <div
      role="status"
      aria-label={LOADING_LABEL}
      className="flex flex-col gap-10 motion-safe:animate-pulse sm:gap-12"
    >
      <Surface className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-12 w-36" />
          <Bone className="h-1.5 w-full max-w-sm" />
          <Bone className="h-3.5 w-full max-w-md" soft />
          <Bone className="h-3.5 w-3/4 max-w-sm" soft />
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-5 sm:p-6 md:border-t-0 md:border-l">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-5 w-48" />
          <Bone className="h-3.5 w-full" soft />
          <Bone className="h-3.5 w-5/6" soft />
          <Bone className="mt-2 h-11 w-full rounded-pill sm:w-44" />
        </div>
      </Surface>
      <SectionBones>
        <Surface className="flex flex-col gap-5 p-4 sm:p-5">
          <Bone className="h-3 w-full rounded-full" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Bone className="h-3.5 w-40" />
              <Bone className="h-3.5 w-10" />
            </div>
          ))}
        </Surface>
      </SectionBones>
    </div>
  );
}

/** The whole page while the client bundle loads (the Suspense fallback). */
export function InsightsLoadingPage() {
  return (
    <PageShell>
      <PageHeader title={PAGE_TITLE} />
      <InsightsSkeleton />
    </PageShell>
  );
}

function Bone({ className, soft = false }: { className: string; soft?: boolean }) {
  return <span className={`block rounded-full ${soft ? "bg-muted/70" : "bg-muted"} ${className}`} />;
}

function SectionBones({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Bone className="h-5 w-40" />
        <Bone className="h-3.5 w-64" soft />
      </div>
      {children}
    </div>
  );
}
