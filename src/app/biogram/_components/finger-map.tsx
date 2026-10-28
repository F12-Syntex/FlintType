"use client";

import { Surface } from "@/components/page-shell";
import {
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  type FingerId,
  type HandLayoutPrefs,
} from "@/lib/hand-layout";
import { cn } from "@/lib/utils";

/* ─── Finger map ───────────────────────────────────────────────── */

export function FingerMapView({
  layout,
  fingerMapHash,
}: {
  layout: HandLayoutPrefs;
  fingerMapHash: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FingerColumn label="Left hand" ids={LEFT_FINGERS} layout={layout} />
        <FingerColumn label="Right hand" ids={RIGHT_FINGERS} layout={layout} />
      </div>
      {/* The raw layout hash is internal; keep it for debugging, out of
          the way. */}
      <details className="group text-xs text-muted-foreground">
        <summary className="w-fit cursor-pointer select-none rounded-pill py-1 transition-colors hover:text-foreground">
          Technical details
        </summary>
        <p className="mt-2 break-all">
          Layout hash{" "}
          <span className="font-mono text-foreground/70">{fingerMapHash}</span>
        </p>
      </details>
    </div>
  );
}

/** `KeyA` → `A`, `Digit1` → `1`, `Semicolon` → `;`; anything else
 *  (Space, Shift, …) keeps its name. */
function keyLabel(code: string): string {
  const named: Record<string, string> = {
    Semicolon: ";",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Quote: "'",
    BracketLeft: "[",
    BracketRight: "]",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
    Backslash: "\\",
  };
  if (named[code]) return named[code];
  return code.replace(/^(Key|Digit)/, "");
}

function FingerColumn({
  label,
  ids,
  layout,
}: {
  label: string;
  ids: readonly FingerId[];
  layout: HandLayoutPrefs;
}) {
  return (
    <Surface className="flex flex-col gap-1 p-4 sm:p-5">
      <h3 className="pb-1 text-sm font-medium text-foreground">{label}</h3>
      <ul className="flex flex-col text-sm">
        {ids.map((id) => {
          const f = layout.fingers[id];
          return (
            <li
              key={id}
              className="flex items-center justify-between gap-3 border-b border-border/60 py-2 last:border-b-0"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "inline-block size-1.5 rounded-full",
                    f.enabled ? "bg-foreground/50" : "bg-foreground/15",
                  )}
                  aria-hidden
                />
                <span className={f.enabled ? "text-foreground" : "text-muted-foreground"}>
                  {FINGER_NAME[id]}
                </span>
              </span>
              {f.enabled ? (
                <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-border border-b-2 bg-background px-1.5 py-0.5 font-mono text-xs font-semibold text-foreground">
                  {keyLabel(f.homeKey)}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Off</span>
              )}
            </li>
          );
        })}
      </ul>
    </Surface>
  );
}
