import Link from "next/link";
import { Tag } from "@/components/ft";
import type { HistoryTest } from "@/types/history";

/** Compact recent-runs table — last N completed tests, newest first.
 *  Mirrors the on-page table conventions from /app/biogram for visual
 *  consistency. Footer links out to /app/history for the full log. */
export function RecentRuns({ tests }: { tests: readonly HistoryTest[] }) {
  const completed = tests.filter((t) => t.wasCompleted).slice(0, 8);

  return (
    <section className="px-5 py-10 sm:px-16 sm:py-12">
      <div className="mb-7 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <Tag>Recent runs</Tag>
        </div>
        <Link
          href="/app/history"
          className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
        >
          View all →
        </Link>
      </div>

      {completed.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No completed runs yet — kick one off at{" "}
          <Link href="/app" className="text-primary hover:underline">
            /app
          </Link>
          .
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-border bg-foreground/[0.02] text-left text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                <th className="py-3 pr-3 pl-4">When</th>
                <th className="py-3 pr-3">Mode</th>
                <th className="py-3 pr-3 text-right">Length</th>
                <th className="py-3 pr-3 text-right">WPM</th>
                <th className="py-3 pr-4 text-right">Acc</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-foreground/5 transition-colors last:border-b-0 hover:bg-foreground/[0.02]"
                >
                  <td className="py-2.5 pr-3 pl-4 text-muted-foreground">
                    {formatWhen(t.startedAtMs)}
                  </td>
                  <td className="py-2.5 pr-3 text-foreground">
                    {prettyMode(t.mode)}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">
                    {t.durationOrWordCount}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-primary">
                    {Math.round(t.wpm)}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-foreground">
                    {t.accuracy.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
