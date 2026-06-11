import Link from "next/link";
import { ftButtonVariants, Stat, Tag, UserTag } from "@/components/ft";
import { formatClock } from "@/lib/format-duration";
import type { SharedTest } from "@/types/share";

/** Friendly mode label for the eyebrow strip. The DB stores `casual`
 *  / `training` / `race` etc. — surface a single readable mode word
 *  rather than the algorithmic slug. */
function modeLabel(mode: string): string {
  if (mode === "race") return "Race";
  if (mode === "training") return "Training";
  if (mode === "reverse_adaptive") return "Reverse";
  return "Casual";
}

/** Length label — matches the OG card style: "Words · 50", "Time ·
 *  60s", "Quote · 3". Time mode is detected by the mode string. */
function lengthLabel(mode: string, amount: number): string {
  if (mode === "time" || /time/i.test(mode)) return `Time · ${amount}s`;
  if (/quote/i.test(mode)) return `Quote · ${amount}`;
  return `Words · ${amount}`;
}

/** Linked handle pill — points at `/profile/<username>` when a Clerk
 *  username exists, else `/profile/<userId>`. The avatar is rendered
 *  via a plain `<img>` to dodge `next/image`'s remote-host allowlist
 *  config; the only source is Clerk's CDN, which is sized + cached at
 *  the edge anyway. */
function HandleStrip({
  handle,
  username,
  avatarUrl,
  tags,
}: Pick<SharedTest, "handle" | "username" | "avatarUrl" | "tags">) {
  const slug = username ?? handle.replace(/^@/, "");
  return (
    <Link
      href={`/profile/${slug}`}
      className="inline-flex items-center gap-2.5 rounded-md border border-ft-ink-line bg-ft-ink-track px-2.5 py-1.5 text-ft-paper transition-colors hover:bg-ft-ink-popover"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          aria-hidden
          width={22}
          height={22}
          className="size-[22px] rounded-full border border-ft-ink-line object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-[22px] place-items-center rounded-full border border-ft-ink-line bg-ft-ink-popover text-[10px] font-bold uppercase text-ft-warm-1"
        >
          {handle.replace(/^@/, "").slice(0, 2)}
        </span>
      )}
      <span className="text-[13px] font-semibold tracking-[0.02em]">
        {handle}
      </span>
      {tags.length > 0 ? (
        <span className="flex items-center gap-1">
          {tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" tooltip={false} />
          ))}
        </span>
      ) : null}
    </Link>
  );
}

/** The on-page render of a shared run. Mirrors the OG card's identity
 *  — dark warm-ink palette, JetBrains Mono, the same stat grid — so
 *  the click-through from a social preview feels like landing on the
 *  same artifact, just live. Mobile collapses the stat row to two
 *  columns; desktop holds the four-up rhythm. */
export function ShareCard({ data }: { data: SharedTest }) {
  const wpm = Math.round(data.wpm);
  const acc = Math.round(data.accuracy * 10) / 10;
  const date = new Date(data.completedAtMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-20">
      <div className="relative flex flex-col gap-6 overflow-hidden rounded-md border border-ft-ink-line bg-ft-ink-deep p-6 sm:p-10">
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-[3px] bg-ft-ember"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <HandleStrip
            handle={data.handle}
            username={data.username}
            avatarUrl={data.avatarUrl}
            tags={data.tags}
          />
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-ft-warm-3">
            <span>{lengthLabel(data.mode, data.durationOrWordCount)}</span>
            <span className="tabular-nums text-ft-warm-1">
              {formatClock(data.durationSec)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-6 border-t border-ft-ink-line pt-6 sm:grid-cols-4">
          <Stat label="WPM" value={wpm} size="xl" accent />
          <Stat label="ACC" value={`${acc}%`} size="xl" />
          <Stat
            label="ERRORS"
            value={data.errorCount}
            size="xl"
          />
          <Stat label="MODE" value={modeLabel(data.mode)} size="lg" />
        </div>

        <div className="flex items-center justify-between border-t border-ft-ink-line pt-5 text-[11px] uppercase tracking-[0.22em] text-ft-warm-3">
          <Tag tone="dim">Run on {date}</Tag>
          <span className="text-ft-paper">flinttype.com</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={ftButtonVariants({ variant: "ember", size: "md" })}>
          Take the test
        </Link>
        <Link
          href={`/profile/${data.username ?? data.handle.replace(/^@/, "")}`}
          className={ftButtonVariants({ variant: "ghost", size: "md" })}
        >
          View profile
        </Link>
      </div>
    </section>
  );
}
