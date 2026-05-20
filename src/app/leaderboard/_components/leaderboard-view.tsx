"use client";

import { useUser } from "@clerk/nextjs";
import { Download, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { type LeaderboardEntry } from "@/types/leaderboard";
import {
  type LeaderboardAudience,
  MODE_LABEL,
  parseAudience,
  parsePreset,
  parseScope,
  parseView,
  parseWindow,
  presetLabel,
  SCOPES,
  WINDOWS,
} from "./filters";
import { LeaderboardRow, LeaderboardWrapper } from "./shared-list";
import { useLeaderboard } from "./use-leaderboard";
import { TopLevelsView, TopPlayersView } from "./user-views";

/** /leaderboard content area. Outer dispatcher picks the matching
 *  sub-component based on the sidebar's ?view= param so each branch
 *  has a fixed hook order (avoids React rule-of-hooks violation
 *  when the body's hook count would otherwise change between
 *  renders).
 *
 *  All three views (recent runs, top players, top by level) render
 *  through the shared <LeaderboardWrapper /> + <LeaderboardRow />
 *  primitives in `shared-list.tsx`, so the chrome + per-row layout
 *  reads identical across surfaces — only the header copy + the
 *  metric mapping into each row's slots differs. */
export function LeaderboardView() {
  const params = useSearchParams();
  const view = parseView(params.get("view"));
  if (view === "players") return <TopPlayersView />;
  if (view === "levels") return <TopLevelsView />;
  return <TableView />;
}

function TableView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const scope = parseScope(params.get("scope"));
  const window_ = parseWindow(params.get("window"));
  const preset = parsePreset(params.get("preset"));
  const { user } = useUser();
  const youUserId = user?.id ?? null;
  const signedIn = !!user;
  // Friends audience needs a signed-in caller — fall back to global
  // for anonymous viewers (the toggle is hidden for them too).
  const audience: LeaderboardAudience = signedIn
    ? parseAudience(params.get("audience"))
    : "global";

  const { data, error, loading, refreshing, refresh } = useLeaderboard(
    scope,
    window_,
    preset,
    audience,
  );

  const entries = data?.entries ?? [];
  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? "All modes";
  const windowLabelText =
    WINDOWS.find((w) => w.id === window_)?.label ?? "All time";
  const presetText = preset === "any" ? null : presetLabel(preset);
  const generatedAt = data?.generatedAtMs ?? null;

  const blurb = (
    <>
      Ranked by net WPM (raw × accuracy). Showing{" "}
      <Pill>{audience === "friends" ? "Friends" : "Global"}</Pill> ·{" "}
      <Pill>{scopeLabel}</Pill> · <Pill>{windowLabelText}</Pill>
      {presetText ? (
        <>
          {" · "}
          <Pill>{presetText}</Pill>
        </>
      ) : null}
      .
    </>
  );

  return (
    <LeaderboardWrapper
      title="Recent runs"
      blurb={blurb}
      loading={loading && entries.length === 0}
      empty={!loading && entries.length === 0}
      error={error && entries.length === 0 ? error : null}
      actions={
        <span data-no-export="true" className="flex flex-wrap items-center gap-2">
          {signedIn ? (
            <AudienceToggle
              audience={audience}
              onSelect={(next) => {
                const sp = new URLSearchParams(params.toString());
                if (next === "global") sp.delete("audience");
                else sp.set("audience", next);
                const qs = sp.toString();
                router.replace(qs ? `${pathname}?${qs}` : pathname, {
                  scroll: false,
                });
              }}
            />
          ) : null}
          <RefreshButton
            onClick={refresh}
            refreshing={refreshing || loading}
            generatedAt={generatedAt}
          />
          <SaveImageButton />
        </span>
      }
    >
      <ol className="flex flex-col">
        {entries.map((entry) => (
          <LeaderboardRow
            key={entry.testId}
            href={`/profile/${entry.username ?? entry.userId}`}
            rank={entry.rank}
            username={entry.username}
            name={entry.name}
            tags={entry.tags}
            isYou={entry.userId === youUserId}
            headline={String(entry.netWpm)}
            headlineSuffix="wpm"
            badge={badgeFor(entry)}
            hint={`raw ${entry.wpm} · ${Math.round(entry.accuracy)}% acc`}
          />
        ))}
      </ol>
    </LeaderboardWrapper>
  );
}

/* ─── Per-run badge ──────────────────────────────────────────── */

const TIME_AMOUNTS = new Set([15, 30, 60, 120]);

function badgeFor(entry: LeaderboardEntry): string {
  const mode = (MODE_LABEL[entry.mode] ?? entry.mode).toUpperCase();
  const suffix = TIME_AMOUNTS.has(entry.durationOrWordCount) ? "s" : "";
  return `${mode} · ${entry.durationOrWordCount}${suffix}`;
}

/* ─── Audience toggle (Global / Friends) ─────────────────────── */

function AudienceToggle({
  audience,
  onSelect,
}: {
  audience: LeaderboardAudience;
  onSelect: (next: LeaderboardAudience) => void;
}) {
  const options: { id: LeaderboardAudience; label: string }[] = [
    { id: "global", label: "Global" },
    { id: "friends", label: "Friends" },
  ];
  return (
    <span
      role="group"
      aria-label="Leaderboard audience"
      className="inline-flex rounded-md border border-border bg-background/40 p-0.5"
    >
      {options.map((o) => {
        const active = o.id === audience;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(o.id)}
            className={cn(
              "rounded-[5px] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </span>
  );
}

/* ─── Blurb pill ─────────────────────────────────────────────── */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-baseline rounded-md border border-border bg-background/40 px-1.5",
        "text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground",
      )}
    >
      {children}
    </span>
  );
}

/* ─── Save image ──────────────────────────────────────────────── */

function SaveImageButton() {
  const [exporting, setExporting] = useState(false);
  const onDownload = useCallback(async () => {
    if (exporting) return;
    const { findScreenshotRoot, naturalScreenshotSize, pickScreenshotBg } =
      await import("@/lib/screenshot");
    const node = findScreenshotRoot();
    if (!node) return;
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const bg = pickScreenshotBg(node);
      const { width, height } = naturalScreenshotSize(node);
      const dataUrl = await toPng(node, {
        cacheBust: true,
        backgroundColor: bg,
        width,
        height,
        filter: (n) =>
          !(n instanceof HTMLElement && n.dataset.noExport === "true"),
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `flinttype-leaderboard-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("[leaderboard] screenshot failed", err);
    } finally {
      setExporting(false);
    }
  }, [exporting]);
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={exporting}
      aria-label="Save leaderboard as image"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        "hover:bg-foreground/[0.04] hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <Download size={12} className="shrink-0" aria-hidden />
      <span>{exporting ? "Saving" : "Save image"}</span>
    </button>
  );
}

/* ─── Refresh control ─────────────────────────────────────────── */

function RefreshButton({
  onClick,
  refreshing,
  generatedAt,
}: {
  onClick: () => void;
  refreshing: boolean;
  generatedAt: number | null;
}) {
  const ageLabel = generatedAt ? formatAge(Date.now() - generatedAt) : "—";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      aria-label="Refresh leaderboard"
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-border bg-background/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors",
        "hover:bg-foreground/[0.04] hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
    >
      <RefreshCw
        size={12}
        className={cn("shrink-0", refreshing && "motion-safe:animate-spin")}
        aria-hidden
      />
      <span className="tabular-nums">{refreshing ? "Refreshing" : ageLabel}</span>
    </button>
  );
}

function formatAge(ms: number): string {
  if (ms < 5_000) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 60 * 60_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / (60 * 60_000))}h ago`;
}
