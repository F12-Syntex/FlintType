import Link from "next/link";
import { cn } from "@/lib/utils";
import type { HistoryTest } from "@/types/history";
import { ProfileSection } from "./profile-section";

/** Recent-runs list. One row per completed test, hairline-divided.
 *  Each row reads as a small editorial summary: when it ran (left),
 *  mode + length pill (middle), big primary WPM + tiny accuracy
 *  (right). No table chrome — the rhythm comes from the divider and
 *  the right-aligned numerics. */
export function RecentRuns({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted).slice(0, 8);

  return (
    <ProfileSection
      label="Recent runs"
      noBorder
      actions={
        <Link
          href="/insights"
          className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
        >
          View all →
        </Link>
      }
    >
      {completed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed runs yet — kick one off at{" "}
          <Link href="/" className="text-primary hover:underline">
            /app
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {completed.map((t) => (
            <RunRow key={t.id} test={t} />
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}

function RunRow({ test }: { test: HistoryTest }) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-foreground/[0.02] sm:grid-cols-[1fr_auto_auto] sm:gap-6 sm:px-5 sm:py-4">
      {/* Left: when + mode pill */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {formatWhen(test.startedAtMs)}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-md border border-border bg-card px-2 py-0.5",
              "text-[10px] font-medium uppercase tracking-[0.16em] text-foreground",
            )}
          >
            {prettyMode(test.mode)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {test.durationOrWordCount}
          </span>
        </div>
      </div>

      {/* Middle (sm+): error count, quiet */}
      <span className="hidden text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:inline">
        <span className="tabular-nums text-foreground">
          {test.errorCount}
        </span>{" "}
        err
      </span>

      {/* Right: WPM big + accuracy small */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tracking-[-0.02em] tabular-nums leading-none text-primary sm:text-[28px]">
          {Math.round(test.wpm)}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] tabular-nums text-muted-foreground">
          {test.accuracy.toFixed(1)}%
        </span>
      </div>
    </li>
  );
}

function prettyMode(m: string): string {
  if (m === "training" || m === "reverse_adaptive") return "training";
  return m;
}

function formatWhen(ms: number): string {
  const d = new Date(ms);
  const now = Date.now();
  const diff = (now - ms) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86_400) return `${Math.floor(diff / 86_400)}d ago`;
  return d.toLocaleDateString();
}
