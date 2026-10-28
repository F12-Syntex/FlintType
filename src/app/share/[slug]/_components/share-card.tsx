import Link from "next/link";
import { UserTag } from "@/components/ft";
import { PageHeader, PageShell } from "@/components/page-shell";
import { formatClock } from "@/lib/format-duration";
import { shareLengthLabel } from "@/lib/share-length-label";
import type { SharedTest } from "@/types/share";
import { ShareActions } from "./share-actions";

/** Friendly mode label. The DB stores `casual` / `training` / `race`
 *  etc. — surface a single readable word rather than the algorithmic
 *  slug. */
function modeLabel(mode: string): string {
  if (mode === "race") return "Race";
  if (mode === "training") return "Training";
  if (mode === "reverse_adaptive") return "Reverse";
  return "Casual";
}

/** `/profile/<username>` when a Clerk username exists, else the handle
 *  without its `@`. */
function profileHref(data: Pick<SharedTest, "username" | "handle">): string {
  return `/profile/${data.username ?? data.handle.replace(/^@/, "")}`;
}

/** Linked handle pill. The avatar is a plain `<img>` to dodge
 *  `next/image`'s remote-host allowlist; the only source is Clerk's CDN,
 *  which is sized + cached at the edge anyway. */
function HandlePill({ data }: { data: SharedTest }) {
  const { handle, avatarUrl, tags } = data;
  return (
    <Link
      href={profileHref(data)}
      className="inline-flex h-9 min-w-0 items-center gap-2 rounded-pill bg-ft-ink-track py-1 pl-1 pr-3 ring-1 ring-inset ring-ft-ink-line text-ft-paper transition-colors hover:bg-ft-ink-popover"
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          aria-hidden
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-ft-ink-popover text-xs font-bold uppercase text-ft-warm-1"
        >
          {handle.replace(/^@/, "").slice(0, 1)}
        </span>
      )}
      <span className="truncate text-sm font-semibold">{handle}</span>
      {tags.length > 0 ? (
        <span className="flex shrink-0 items-center gap-1">
          {tags.map((t) => (
            <UserTag key={t} tag={t} size="sm" tooltip={false} />
          ))}
        </span>
      ) : null}
    </Link>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ft-warm-3">{label}</span>
      <span className="text-xl font-semibold tracking-tight tabular-nums text-ft-paper sm:text-2xl">
        {value}
      </span>
    </div>
  );
}

/** The on-page render of a shared run. The card mirrors the OG image's
 *  identity — a fixed dark warm-ink artifact, so the click-through from
 *  a social preview lands on the same object — while the page around it
 *  (heading, buttons) follows the viewer's theme. WPM is the one orange
 *  number; everything else stays ink. */
export function ShareCard({ data }: { data: SharedTest }) {
  const wpm = Math.round(data.wpm);
  const acc = Math.round(data.accuracy * 10) / 10;
  const date = new Date(data.completedAtMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const test = `${shareLengthLabel(data.lengthMode, data.durationOrWordCount)} · ${modeLabel(data.mode)}`;

  return (
    <PageShell width="text">
      <PageHeader
        eyebrow="Shared result"
        title={`Can you beat ${data.handle}?`}
        description={`${data.handle} typed ${wpm} wpm at ${acc}% accuracy on flinttype. Take a test and see where you land.`}
      />

      <div className="flex flex-col gap-6">
        <article className="relative isolate flex flex-col gap-7 overflow-hidden rounded-2xl bg-ft-ink-deep p-5 ring-1 ring-ft-ink-line text-ft-paper shadow-float sm:gap-8 sm:p-8">
          {/* A soft static ember glow in the corner — the logo's warmth,
              not a moving decoration. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full bg-primary/25 blur-3xl"
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <HandlePill data={data} />
            <span className="text-xs tabular-nums text-ft-warm-2">{date}</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-7xl font-extrabold leading-none tracking-[-0.04em] tabular-nums text-primary sm:text-8xl">
              {wpm}
            </span>
            <span className="text-lg font-semibold text-ft-warm-1 sm:text-xl">wpm</span>
          </div>

          {/* Hairlines on this fixed artifact are rings / 1px fills so
              the global Borders setting can't recolour them. */}
          <span aria-hidden className="-my-2 h-px bg-ft-ink-line sm:-my-3" />
          <div className="grid grid-cols-3 gap-4">
            <Figure label="Accuracy" value={`${acc}%`} />
            <Figure label="Errors" value={String(data.errorCount)} />
            <Figure label="Time" value={formatClock(data.durationSec)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex h-7 items-center rounded-pill bg-ft-ink-track px-3 text-xs font-medium text-ft-warm-1">
              {test}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-ft-paper">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/flinttype-logo.svg" alt="" aria-hidden className="h-4 w-auto" />
              flinttype.com
            </span>
          </div>
        </article>

        <ShareActions profileHref={profileHref(data)} />
      </div>
    </PageShell>
  );
}
