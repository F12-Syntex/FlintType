"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tag } from "@/components/ft";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type ChangelogEntry,
  changesSince,
  parseChangelog,
} from "@/lib/changelog";
import { APP_VERSION } from "@/lib/version";

/** localStorage key holding the last app version this browser has seen
 *  the "what's new" dialog for. Compared against APP_VERSION on every
 *  load; a mismatch (and a non-first visit) surfaces the changes since. */
const SEEN_KEY = "ft:whats-new-version";

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(version: string) {
  try {
    localStorage.setItem(SEEN_KEY, version);
  } catch {
    /* private mode / storage disabled — the dialog just re-evaluates next load */
  }
}

/** Globally-mounted (see providers.tsx). On load it compares the cached
 *  version against the running APP_VERSION:
 *
 *  - cached === current  → nothing.
 *  - cached === null (first ever visit) → silently record current; a
 *    brand-new user has no "since you were away" to show.
 *  - cached < current → fetch the public changelog, render the versions
 *    released in between, and advance the cache once dismissed.
 *
 *  The changelog is fetched lazily (only on a real version bump) so it
 *  never bloats the bundle, and every storage / network failure fails
 *  quiet — a release-note popup must never be able to break the app. */
export function WhatsNewDialog() {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [since, setSince] = useState("");

  useEffect(() => {
    const seen = readSeen();
    if (seen === APP_VERSION) return;
    if (seen === null) {
      writeSeen(APP_VERSION);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/changelog.md", { cache: "no-cache" });
        if (!res.ok) throw new Error(`changelog ${res.status}`);
        const fresh = changesSince(parseChangelog(await res.text()), seen, APP_VERSION);
        if (cancelled) return;
        if (fresh.length === 0) {
          writeSeen(APP_VERSION);
          return;
        }
        setEntries(fresh);
        setSince(seen);
        setOpen(true);
      } catch {
        // Couldn't load the changelog — advance the cache anyway so a
        // transient failure doesn't re-fetch on every single load.
        if (!cancelled) writeSeen(APP_VERSION);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    writeSeen(APP_VERSION);
    setOpen(false);
  }

  if (entries.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && dismiss()}>
      <DialogContent className="flex max-h-[78vh] w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
          <Tag className="mb-2 block">Changelog</Tag>
          <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
            What&apos;s new.
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
            Everything that landed since you were last here{" "}
            <span className="tabular-nums text-foreground/70">(v{since})</span>.
          </DialogDescription>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5 sm:px-6">
          {entries.map((entry) => (
            <section key={entry.version}>
              <header className="flex items-baseline justify-between gap-3 border-b border-border pb-2">
                <h3 className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground">
                  {entry.version}
                </h3>
                <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] tabular-nums text-muted-foreground">
                  {entry.date}
                </span>
              </header>
              <ul className="flex flex-col gap-2 pt-3">
                {entry.lines.map((line, i) => (
                  <li key={i} className="flex items-baseline gap-3">
                    <span
                      aria-hidden
                      className="mt-[0.5em] size-1 shrink-0 rounded-[1px] bg-primary/60"
                    />
                    <span className="text-[13px] leading-relaxed text-foreground/85 sm:text-sm">
                      {line}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/changelog"
            onClick={dismiss}
            className="text-center text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-left"
          >
            Full changelog
          </Link>
          <Button onClick={dismiss} className="w-full sm:w-auto">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
