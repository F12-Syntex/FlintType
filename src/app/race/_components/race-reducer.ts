import {
  BOTS,
  BOT_TICK_MS,
  generateRacePassage,
  instantBotWpm,
  RACE_MODES,
  type BotId,
  type RaceModeId,
} from "./race-data";
import type {
  Action,
  FeedEvent,
  Racer,
  RaceState,
} from "./race-types";

const FEED_LIMIT = 14;

function buildRacers(
  botIds: readonly BotId[],
  withQueue: boolean,
  youName: string,
): Racer[] {
  const you: Racer = {
    id: "you",
    name: youName,
    flag: "—",
    badge: "RACER",
    isYou: true,
    bot: null,
    correctChars: 0,
    wpm: 0,
    finishedAt: null,
    place: null,
    charProgress: 0,
    joinedAt: 0,
    errors: 0,
    disconnected: false,
  };
  const bots: Racer[] = botIds.map((id) => {
    const b = BOTS[id];
    return {
      id: b.id,
      name: b.name,
      flag: b.flag,
      badge: b.badge,
      isYou: false,
      bot: b,
      correctChars: 0,
      wpm: 0,
      finishedAt: null,
      place: null,
      charProgress: 0,
      // queue flow → bots haven't joined yet; matching phase fills
      // these one by one. Skipping the queue (race-again) → bots
      // already at the table, joinedAt = 0.
      joinedAt: withQueue ? null : 0,
      errors: 0,
      disconnected: false,
    };
  });
  return [you, ...bots];
}

/** Total chars for a passage = sum(word.length) + (words-1) spaces. */
function totalCharsOf(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let n = words.length - 1; // spaces between words
  for (const w of words) n += w.length;
  return n;
}

export function freshState(
  modeId: RaceModeId,
  seed: number,
  now: number,
  withQueue: boolean,
  youName: string,
): RaceState {
  const mode = RACE_MODES[modeId];
  // Burst mode reuses the `words` slot for its item list (so the
  // existing PracticeProvider plumbing in the race shell receives
  // something well-formed, even though burst doesn't drive practice
  // state). Total progress in burst is measured in reps rather than
  // chars: items × repsPerItem. Both modes converge on
  // `correctChars >= totalChars` as the finish predicate.
  const isBurst = mode.kind === "burst";
  const words = isBurst
    ? mode.burst!.items.slice()
    : generateRacePassage(mode.wordCount, seed);
  const totalChars = isBurst
    ? mode.burst!.items.length * mode.burst!.repsPerItem
    : totalCharsOf(words);
  let racers = buildRacers(mode.botIds, withQueue, youName);
  if (isBurst) {
    racers = racers.map((r) => ({ ...r, burstItemIdx: 0, burstReps: 0 }));
  }
  return {
    modeId,
    phase: withQueue ? "queue" : "lobby",
    raceSeed: seed,
    words,
    totalChars,
    queueStartedAt: null,
    countdownStartedAt: null,
    raceStartedAt: null,
    raceEndedAt: null,
    nowMs: now,
    racers,
    feed: [
      {
        t: 0,
        who: "race",
        text: withQueue
          ? `${mode.name} · queue up to find an opponent`
          : `${mode.name} · lobby ready`,
        accent: false,
      },
    ],
    trace: [],
    lastLeaderId: null,
    milestonesByRacer: {},
  };
}

function elapsedSec(s: RaceState): number {
  if (s.raceStartedAt == null) return 0;
  return Math.max(0, Math.floor((s.nowMs - s.raceStartedAt) / 1000));
}

function emit(s: RaceState, ev: FeedEvent): FeedEvent[] {
  return [ev, ...s.feed].slice(0, FEED_LIMIT);
}

function applyMilestones(s: RaceState): RaceState {
  if (s.totalChars === 0) return s;
  let feed = s.feed;
  const next: Record<string, number[]> = {};
  for (const r of s.racers) {
    const pct = r.correctChars / s.totalChars;
    const seen = s.milestonesByRacer[r.id] ?? [];
    const updated = [...seen];
    for (const m of [25, 50, 75] as const) {
      if (pct >= m / 100 && !updated.includes(m)) {
        updated.push(m);
        feed = [
          {
            t: elapsedSec(s),
            who: r.name,
            text: `crossed ${m}%`,
            accent: m >= 50 && !r.isYou,
          },
          ...feed,
        ].slice(0, FEED_LIMIT);
      }
    }
    next[r.id] = updated;
  }
  return { ...s, feed, milestonesByRacer: next };
}

function rankAndMaybeFinish(s: RaceState): RaceState {
  const finishingNow: number[] = [];
  let racers = s.racers.map((r, idx) => {
    if (r.place != null) return r;
    if (r.finishedAt != null) {
      // Pre-set finishedAt (e.g. human via TICK youFinished) still
      // needs a place number — flag for the assignment loop below.
      finishingNow.push(idx);
      return r;
    }
    if (r.correctChars >= s.totalChars) {
      finishingNow.push(idx);
      return { ...r, correctChars: s.totalChars, finishedAt: elapsedSec(s) };
    }
    return r;
  });
  if (finishingNow.length > 0) {
    const alreadyFinished = racers.filter((r) => r.place != null).length;
    let nextPlace = alreadyFinished + 1;
    racers = racers.map((r, idx) =>
      finishingNow.includes(idx) && r.place == null
        ? { ...r, place: nextPlace++ }
        : r,
    );
  }
  let next: RaceState = { ...s, racers };
  for (const idx of finishingNow) {
    const r = racers[idx]!;
    next = {
      ...next,
      feed: emit(next, {
        t: elapsedSec(next),
        who: r.name,
        text: `finished · place ${r.place ?? "?"}`,
        accent: r.isYou || (r.place ?? 99) === 1,
      }),
    };
  }
  const allDone = racers.every((r) => r.finishedAt != null);
  if (allDone && next.phase === "racing") {
    next = { ...next, phase: "finished", raceEndedAt: next.nowMs };
  }
  return next;
}

function recomputeLeader(s: RaceState): RaceState {
  if (s.phase !== "racing") return s;
  let leader: Racer | null = null;
  for (const r of s.racers) {
    if (r.finishedAt != null) continue;
    if (leader == null || r.correctChars > leader.correctChars) leader = r;
  }
  if (!leader) return s;
  if (leader.id === s.lastLeaderId) return s;
  if (s.lastLeaderId == null && leader.correctChars === 0) {
    return { ...s, lastLeaderId: leader.id };
  }
  return {
    ...s,
    lastLeaderId: leader.id,
    feed: emit(s, {
      t: elapsedSec(s),
      who: leader.name,
      text: "took the lead",
      accent: !leader.isYou,
    }),
  };
}

function applyPipeline(s: RaceState): RaceState {
  return recomputeLeader(rankAndMaybeFinish(applyMilestones(s)));
}

export function reducer(s: RaceState, a: Action): RaceState {
  switch (a.type) {
    case "SET_MODE":
      return freshState(
        a.modeId,
        a.seed,
        a.now,
        a.withQueue,
        s.racers.find((r) => r.isYou)?.name ?? "@you",
      );
    case "RESTART":
      return freshState(
        s.modeId,
        a.seed,
        a.now,
        a.withQueue,
        s.racers.find((r) => r.isYou)?.name ?? "@you",
      );
    case "ENTER_QUEUE": {
      if (s.phase !== "queue") return s;
      return {
        ...s,
        phase: "matching",
        queueStartedAt: a.now,
        nowMs: a.now,
        feed: emit(s, {
          t: 0,
          who: "race",
          text: "finding racers…",
          accent: false,
        }),
      };
    }
    case "BOT_JOIN": {
      if (s.phase !== "matching") return s;
      const racers = s.racers.map((r, i) =>
        i === a.botIdx && r.joinedAt == null ? { ...r, joinedAt: 0 } : r,
      );
      const allJoined = racers.every((r) => r.joinedAt != null);
      let feed = s.feed;
      const justJoined = racers[a.botIdx];
      if (justJoined && justJoined.joinedAt != null) {
        feed = emit(
          { ...s, feed },
          {
            t: 0,
            who: justJoined.name,
            text: "joined the lobby",
            accent: false,
          },
        );
      }
      let next: RaceState = { ...s, racers, feed, nowMs: a.now };
      if (allJoined) {
        next = {
          ...next,
          phase: "lobby",
          feed: emit(next, {
            t: 0,
            who: "race",
            text: "lobby full · ready to start",
            accent: true,
          }),
        };
      }
      return next;
    }
    case "START_COUNTDOWN": {
      if (s.phase !== "lobby") return s;
      return {
        ...s,
        phase: "countdown",
        countdownStartedAt: a.now,
        nowMs: a.now,
      };
    }
    case "START_RACE": {
      if (s.phase !== "countdown") return s;
      return {
        ...s,
        phase: "racing",
        raceStartedAt: a.now,
        nowMs: a.now,
        feed: emit(s, { t: 0, who: "race", text: "GO", accent: true }),
      };
    }
    case "TICK": {
      let next: RaceState = { ...s, nowMs: a.now };
      if (a.trace) next = { ...next, trace: [...next.trace, a.trace] };
      if (s.phase !== "racing" || s.raceStartedAt == null) return next;
      const elapsedMs = a.now - s.raceStartedAt;
      const dtSec = BOT_TICK_MS / 1000;
      const mode = RACE_MODES[s.modeId];
      const isBurst = mode.kind === "burst";
      const burst = mode.burst;
      const racers = next.racers.map((r) => {
        if (r.finishedAt != null) return r;
        if (r.isYou) {
          // In burst mode the user's correctChars / wpm / finished come
          // from the burst surface via USER_BURST_COMMIT — don't
          // overwrite them from the practice snapshot, which has no
          // bearing on burst progress.
          if (isBurst) return r;
          // Passage mode: practice snapshot drives the user's lane.
          // Mark finishedAt the moment practice flips to `done`. The
          // user doesn't need to hit 100% accuracy — they just need
          // to reach the end of the passage. rankAndMaybeFinish picks
          // up the pre-set finishedAt below and assigns a place.
          return {
            ...r,
            correctChars: Math.min(s.totalChars, a.youCorrectChars),
            wpm: a.youWpm,
            finishedAt:
              r.finishedAt != null
                ? r.finishedAt
                : a.youFinished
                  ? elapsedSec(next)
                  : null,
          };
        }
        const bot = r.bot!;
        const wpm = instantBotWpm(bot, elapsedMs, s.raceSeed);
        if (isBurst && burst) {
          // Burst-mode bot tick: convert WPM into reps/sec for the
          // current item word and accumulate fractional reps. Bots
          // never "fail" the threshold — their targetWpm is set above
          // it by design — so each successful rep counts. Each
          // attempt at WPM = (wordLen × 5 / wpm) minutes; reps/sec =
          // wpm / (5 × wordLen) × (1/60). dtSec=0.05 makes this very
          // small per tick, so we accumulate in charProgress and
          // flush whole reps as they cross integer boundaries.
          const itemIdx = r.burstItemIdx ?? 0;
          if (itemIdx >= burst.items.length) return r;
          const wordLen = burst.items[itemIdx]!.length;
          const repsThisTick = (wpm * dtSec) / (12 * wordLen);
          const totalProg = r.charProgress + repsThisTick;
          let wholeReps = Math.floor(totalProg);
          let nextItemIdx = itemIdx;
          let nextBurstReps = (r.burstReps ?? 0) + wholeReps;
          // Cascade reps into item advances while the streak overruns
          // repsPerItem. Pure passthrough on the typical 0–1 rep/tick
          // ratio; only matters on long stalls where the accumulator
          // bunches a few reps together on one tick.
          while (nextBurstReps >= burst.repsPerItem && nextItemIdx < burst.items.length) {
            nextBurstReps -= burst.repsPerItem;
            nextItemIdx += 1;
          }
          if (nextItemIdx >= burst.items.length) {
            nextBurstReps = 0;
          }
          const correctChars = Math.min(
            s.totalChars,
            nextItemIdx * burst.repsPerItem + nextBurstReps,
          );
          return {
            ...r,
            charProgress: totalProg - wholeReps,
            correctChars,
            burstItemIdx: nextItemIdx,
            burstReps: nextBurstReps,
            wpm: Math.round(wpm),
          };
        }
        const charsThisTick = (wpm / 60) * 5 * dtSec;
        const totalProg = r.charProgress + charsThisTick;
        const whole = Math.floor(totalProg);
        return {
          ...r,
          charProgress: totalProg - whole,
          correctChars: Math.min(s.totalChars, r.correctChars + whole),
          wpm: Math.round(wpm),
        };
      });
      return applyPipeline({ ...next, racers });
    }
    case "USER_BURST_COMMIT": {
      const mode = RACE_MODES[s.modeId];
      if (mode.kind !== "burst" || !mode.burst) return s;
      if (s.phase !== "racing") return s;
      const racers = s.racers.map((r) => {
        if (!r.isYou) return r;
        if (r.finishedAt != null) return r;
        if (!a.success) {
          // Failed attempt — slow or wrong. Reset reps to 0; itemIdx
          // stays put. Correct-char progress drops back to the last
          // cleared item boundary so the lane bar honestly reflects
          // the user lost their streak. `wpm: 0` is the sentinel the
          // burst surface uses for a mistype (no measured WPM) — keep
          // the previous lane wpm in that case so the display doesn't
          // flicker back to zero on every wrong key.
          const itemIdx = r.burstItemIdx ?? 0;
          return {
            ...r,
            burstReps: 0,
            correctChars: itemIdx * mode.burst!.repsPerItem,
            wpm: a.wpm > 0 ? a.wpm : r.wpm,
          };
        }
        const itemIdx = r.burstItemIdx ?? 0;
        const reps = (r.burstReps ?? 0) + 1;
        const advance = reps >= mode.burst!.repsPerItem;
        const nextItemIdx = advance ? itemIdx + 1 : itemIdx;
        const nextReps = advance ? 0 : reps;
        const correctChars = Math.min(
          s.totalChars,
          nextItemIdx * mode.burst!.repsPerItem + nextReps,
        );
        const finishedAll = nextItemIdx >= mode.burst!.items.length;
        return {
          ...r,
          burstItemIdx: nextItemIdx,
          burstReps: nextReps,
          correctChars,
          wpm: a.wpm,
          finishedAt: finishedAll ? elapsedSec({ ...s, nowMs: a.now }) : r.finishedAt,
        };
      });
      return applyPipeline({ ...s, racers, nowMs: a.now });
    }
  }
}
