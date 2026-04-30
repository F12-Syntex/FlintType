import Link from "next/link";
import { FtButton, ftButtonVariants, Stat, Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { SignOutLink } from "../_components/sign-out-link";

export const metadata = buildPageMetadata({
  title: "Profile",
  description:
    "flinttype profile — identity, lifetime totals, current streak, and account controls.",
  path: "/app/profile",
  noIndex: true,
});

// Frontend-only mock data. Swaps to backend on a single line each when
// `useBackend().profile.get()` lands.
const PROFILE = {
  handle: "@you",
  email: "you@flinttype.local",
  joined: "Joined Jan 2026",
  initials: "Y",
};

const TOTALS = [
  { label: "RUNS", value: "1,284" },
  { label: "MEAN WPM", value: "84" },
  { label: "BEST WPM", value: "112" },
  { label: "MEAN ACC", value: "97.4%" },
];

const STREAK = {
  current: "4",
  longest: "21",
  lastRun: "12m ago",
};

const RECENT = [
  { date: "Today · 09:42", run: "EN-COMMON · 50", wpm: 92, acc: "98%" },
  { date: "Today · 09:35", run: "EN-COMMON · 50", wpm: 88, acc: "97%" },
  { date: "Yesterday · 21:11", run: "PROGRAMMING · 100", wpm: 76, acc: "94%" },
  { date: "Yesterday · 20:54", run: "EN · 100", wpm: 81, acc: "96%" },
  { date: "Apr 28 · 18:02", run: "EN-COMMON · 200", wpm: 84, acc: "97%" },
];

export default function ProfilePage() {
  return (
    <AppChrome>
      <header className="border-b border-ft-line-soft px-5 pt-7 pb-6 sm:px-14">
        <div className="mb-3.5 flex items-center gap-3.5">
          <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
          <Tag>PROFILE · ACCOUNT</Tag>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className="flex size-14 items-center justify-center rounded-full bg-ft-ember/10 text-xl font-bold tracking-wide text-ft-ember"
              aria-hidden
            >
              {PROFILE.initials}
            </span>
            <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                {PROFILE.handle}
              </h1>
              <span className="text-[11px] uppercase tracking-[0.16em] text-ft-dim">
                {PROFILE.email} · {PROFILE.joined}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/app/customise"
              className={ftButtonVariants({ variant: "ghost", size: "sm" })}
            >
              SETTINGS
            </Link>
            <FtButton variant="ember" size="sm">EDIT PROFILE</FtButton>
          </div>
        </div>
      </header>

      <section className="border-b border-ft-line-soft px-5 py-7 sm:px-14">
        <Tag>LIFETIME TOTALS</Tag>
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          {TOTALS.map((t) => (
            <Stat key={t.label} label={t.label} value={t.value} />
          ))}
        </div>
      </section>

      <section className="border-b border-ft-line-soft px-5 py-7 sm:px-14">
        <Tag>STREAK</Tag>
        <div className="mt-5 flex flex-wrap items-baseline gap-x-10 gap-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight tabular-nums text-ft-ember">
              {STREAK.current}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ft-dim">
              days · current
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight tabular-nums text-ft-ink">
              {STREAK.longest}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ft-dim">
              days · longest
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ft-dim-2">
            last run · {STREAK.lastRun}
          </span>
        </div>
      </section>

      <section className="border-b border-ft-line-soft px-5 py-7 sm:px-14">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
          <Tag>RECENT RUNS</Tag>
          <Link
            href="/app/history"
            className="text-[11px] uppercase tracking-[0.16em] text-ft-dim transition-colors hover:text-ft-ember"
          >
            VIEW ALL →
          </Link>
        </div>
        <ul className="flex flex-col">
          {RECENT.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex flex-wrap items-baseline justify-between gap-3 py-3 text-[12px]",
                i > 0 && "border-t border-ft-line-soft",
              )}
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold text-ft-ink">{r.run}</span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-ft-dim">
                  {r.date}
                </span>
              </div>
              <div className="flex items-baseline gap-4 tabular-nums">
                <span className="font-semibold text-ft-ink">{r.wpm} wpm</span>
                <span className="text-ft-dim-2">{r.acc} acc</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="px-5 py-7 sm:px-14">
        <Tag>ACCOUNT</Tag>
        <div className="mt-4 flex flex-col gap-3">
          <AccountRow
            label="Manage account"
            help="Change email, password, or display name."
          >
            <FtButton variant="ghost" size="sm">OPEN</FtButton>
          </AccountRow>
          <AccountRow
            label="Danger zone"
            help="Delete every run, reset stats, or remove the account."
          >
            <FtButton variant="ghost" size="sm">REVIEW</FtButton>
          </AccountRow>
          <AccountRow label="Sign out" help="End the current session.">
            <span className="text-[11px]">
              <SignOutLink />
            </span>
          </AccountRow>
        </div>
      </section>
    </AppChrome>
  );
}

function AccountRow({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-ft-line-soft bg-white px-4 py-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] font-semibold text-ft-ink">{label}</span>
        <span className="text-[11px] text-ft-dim-2">{help}</span>
      </div>
      {children}
    </div>
  );
}
