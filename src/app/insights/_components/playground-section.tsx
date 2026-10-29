"use client";

import { useAuth } from "@clerk/nextjs";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ConfidencePlayground } from "./confidence-playground";
import { PLAYGROUND_DESCRIPTION, PLAYGROUND_TITLE } from "./insights-copy";

/** "Try any text" (spec-40 §3.7): a native disclosure, collapsed by
 *  default. The playground mounts only once it is opened, so a visit
 *  never spends the scoring budget on the sample text unasked. */
export function PlaygroundSection({ cold }: { cold: boolean }) {
  const { userId } = useAuth();
  const [opened, setOpened] = useState(false);
  return (
    <section id="playground" className="scroll-mt-24">
      <details className="group" onToggle={(e) => {
          const open = e.currentTarget.open;
          if (open) setOpened(true);
        }}>
        {/* A summary may hold one heading plus phrasing content, so the
            heading, its line and the chevron sit in a grid, not a div. */}
        <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring/60 focus-visible:outline-solid [&::-webkit-details-marker]:hidden">
          <h2 className="text-base font-semibold text-foreground">{PLAYGROUND_TITLE}</h2>
          <ChevronDown
            aria-hidden
            className="row-span-2 size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
          />
          <span className="text-sm text-muted-foreground">{PLAYGROUND_DESCRIPTION}</span>
        </summary>
        {opened && userId ? (
          <div className="mt-5">
            <ConfidencePlayground cold={cold} userId={userId} />
          </div>
        ) : null}
      </details>
    </section>
  );
}
