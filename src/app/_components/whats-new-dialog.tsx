"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
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
        // The file is public/CHANGELOG.md. Static hosting is case
        // sensitive on Linux (Vercel), so the path must match exactly.
        const res = await fetch("/CHANGELOG.md", { cache: "no-cache" });
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
        <div className="flex shrink-0 items-start gap-3.5 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Sparkles size={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-1 pr-6">
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
              What&apos;s new
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              Everything that changed since you were last here{" "}
              <span className="tabular-nums">(v{since})</span>.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto border-y border-border/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-6">
            {entries.map((entry) => (
              <section key={entry.version} className="flex flex-col gap-3">
                <header className="flex items-center gap-2.5">
                  <h3 className="inline-flex h-6 items-center rounded-pill bg-muted px-2.5 text-xs font-semibold tabular-nums text-foreground">
                    v{entry.version}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {entry.date}
                  </span>
                </header>
                <ul className="flex flex-col gap-2">
                  {entry.lines.map((line, i) => (
                    <li key={i} className="flex gap-3">
                      <span
                        aria-hidden
                        className="mt-[0.6em] size-1.5 shrink-0 rounded-full bg-primary/70"
                      />
                      <span className="text-sm leading-relaxed text-foreground/85">
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Link
            href="/changelog"
            onClick={dismiss}
            className={cn(buttonVariants({ variant: "ghost" }), "h-11 text-muted-foreground sm:h-9")}
          >
            Full changelog
          </Link>
          <Button onClick={dismiss} size="lg" className="w-full sm:h-9 sm:w-auto sm:px-5">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
