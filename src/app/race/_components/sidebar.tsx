"use client";

import Link from "next/link";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { cn } from "@/lib/utils";
import {
  playerColorFor,
  progressOf,
  RACE_MODES,
  RACE_MODE_ORDER,
  type RaceModeId,
} from "./race-data";
import { useRace } from "./race-state";
import type { FeedEvent, Racer } from "./race-types";

/** Right-rail sidebar. Two live sections:
 *    YOUR RUN    — your placement, wpm, accuracy, completion
 *    RACE MODES  — every mode is selectable; clicking swaps the
 *                  passage + bot lineup and resets to lobby. */
export function RaceSidebar() {
  const { state, modeId, setModeId, elapsedSeconds } = useRace();
  const { prefs } = useAppearancePrefs();
  const showFeed = prefs.multiplayerRaceFeed;
  const racers = [...state.racers].sort(
    (a, b) => b.correctChars - a.correctChars,
  );
  const you = state.racers.find((r) => r.isYou)!;
  const yourLivePlace =
    you.place ?? racers.findIndex((r) => r.id === "you") + 1;
  const pct = Math.round(progressOf(you.correctChars, state.totalChars) * 100);
  const allowSwitch =
    state.phase === "queue" ||
    state.phase === "lobby" ||
    state.phase === "finished";

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-md border border-border bg-card/40 lg:w-[24rem] lg:rounded-none lg:border-0 lg:border-l lg:bg-transparent">
      <Section title="YOUR RUN">
        <div className="flex flex-col gap-2.5 text-[11px]">
          <Row
            label="placement"
            value={`#${yourLivePlace} of ${state.racers.length}`}
            accent={yourLivePlace === 1}
          />
          <Row label="wpm" value={String(you.wpm)} accent />
          <Row label="progress" value={`${pct}%`} />
          <Row label="elapsed" value={formatT(elapsedSeconds)} />
        </div>
      </Section>

      <Section
        title="RACE MODES"
        rightHint={allowSwitch ? "" : "FINISH TO SWAP"}
      >
        <div className="flex flex-col gap-2">
          {RACE_MODE_ORDER.map((id) => (
            <ModeChip
              key={id}
              id={id}
              active={id === modeId}
              disabled={!allowSwitch}
              onSelect={() => setModeId(id)}
            />
          ))}
        </div>
      </Section>

      {showFeed ? (
        <Section
          title="RACE FEED"
          rightHint={
            state.phase === "racing" ? (
              <LiveDot label="LIVE" />
            ) : undefined
          }
        >
          <div className="-mx-1 flex max-h-[14rem] flex-col overflow-y-auto pr-1">
            {state.feed.length === 0 ? (
              <span className="px-1 text-[10px] text-muted-foreground">
                Race events appear here once GO fires.
              </span>
            ) : null}
            {state.feed.map((e, i) => (
              <FeedRow
                key={`${e.t}-${i}-${e.who}`}
                event={e}
                racers={state.racers}
                useColors={prefs.multiplayerPlayerColors}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <Section title="MULTIPLAYER">
        <Link
          href="/customise/appearance#multiplayer"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Open multiplayer settings →
        </Link>
      </Section>
    </aside>
  );
}

function Section({
  title,
  rightHint,
  children,
}: {
  title: string;
  rightHint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-6 py-5">
      <div className="mb-3.5 flex justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-foreground">
          {title}
        </span>
        {rightHint ? (
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {rightHint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

/** Pulsing live indicator next to the FEED section title while a race
 *  is in progress. Pairs a tiny ember-coloured square with the LIVE
 *  label so the read survives at small sizes. */
function LiveDot({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-1.5 rounded-sm bg-primary motion-safe:animate-pulse"
      />
      <span className="text-primary">{label}</span>
    </span>
  );
}

/** Classify a feed entry so the row can pick the right marker, weight,
 *  and verb hue. Driven by `text` keywords because the reducer doesn't
 *  carry an event-kind tag — adding one would mean threading it through
 *  every `emit()` site, and the keyword check is reliable enough for
 *  the four categories we render today. */
function classify(text: string): "lead" | "finish" | "milestone" | "info" {
  if (text.startsWith("finished")) return "finish";
  if (text === "took the lead") return "lead";
  if (text.startsWith("crossed ")) return "milestone";
  return "info";
}

function FeedRow({
  event,
  racers,
  useColors,
}: {
  event: FeedEvent;
  racers: readonly Racer[];
  useColors: boolean;
}) {
  // Map @name → racer so we can paint the marker + name in the
  // racer's brand colour when player colours are on. Race-meta
  // entries (who: "race") fall through and render as a hairline tick
  // + muted text — they're system messages, not opponent events.
  const racer = racers.find((r) => r.name === event.who) ?? null;
  const kind = classify(event.text);
  const color = racer && useColors ? playerColorFor(racer.id) : undefined;
  const isYou = racer?.isYou ?? false;
  // Important events (lead change, finish, GO) carry the brand spark
  // when no per-racer colour is in play — same accent rule as the
  // existing feed but pushed onto a dedicated marker so the name
  // weight stays consistent with non-accent rows.
  const accent = event.accent && !color;
  return (
    <div
      className={cn(
        "group/feed grid grid-cols-[10px_1fr_36px] items-baseline gap-2 border-b border-border/40 px-1 py-2 last:border-b-0",
        kind === "finish" && "bg-primary/[0.04]",
      )}
    >
      <span
        aria-hidden
        className="mt-1 inline-block size-1.5 rounded-sm"
        style={{
          backgroundColor:
            color ?? (accent ? "var(--primary)" : "var(--muted-foreground)"),
          opacity: racer ? 1 : 0.45,
        }}
      />
      <div className="min-w-0 text-[11px] leading-snug">
        <span
          className={cn(
            "font-semibold",
            isYou && !color && "text-primary",
          )}
          style={color ? { color } : undefined}
        >
          {racer ? event.who : event.who.toUpperCase()}
        </span>{" "}
        <span
          className={cn(
            kind === "lead" || kind === "finish"
              ? "text-foreground/85"
              : "text-muted-foreground",
          )}
        >
          {event.text}
        </span>
      </div>
      <span className="text-right text-[10px] tabular-nums text-muted-foreground/80">
        {formatT(event.t)}
      </span>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ModeChip({
  id,
  active,
  disabled,
  onSelect,
}: {
  id: RaceModeId;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const mode = RACE_MODES[id];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border px-2.5 py-2 text-left transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
        active
          ? "border-primary/50 bg-primary/[0.06]"
          : "border-border hover:bg-accent/40",
        disabled && !active && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <div>
        <div
          className={cn(
            "text-[11px] font-semibold uppercase tracking-[0.16em]",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {mode.name}
        </div>
        <div className="mt-0.5 text-[10px] text-muted-foreground">
          {mode.detail}
        </div>
      </div>
      {active ? (
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary">
          active
        </span>
      ) : null}
    </button>
  );
}

function formatT(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
