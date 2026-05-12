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

function buildRacers(botIds: readonly BotId[], withQueue: boolean): Racer[] {
  const you: Racer = {
    id: "you",
    name: "@you",
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
): RaceState {
  const mode = RACE_MODES[modeId];
  const words = generateRacePassage(mode.wordCount, seed);
  return {
    modeId,
    phase: withQueue ? "queue" : "lobby",
    raceSeed: seed,
    words,
    totalChars: totalCharsOf(words),
    queueStartedAt: null,
    countdownStartedAt: null,
    raceStartedAt: null,
    raceEndedAt: null,
    nowMs: now,
    racers: buildRacers(mode.botIds, withQueue),
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
      return freshState(a.modeId, a.seed, a.now, a.withQueue);
    case "RESTART":
      return freshState(s.modeId, a.seed, a.now, a.withQueue);
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
      const racers = next.racers.map((r) => {
        if (r.finishedAt != null) return r;
        if (r.isYou) {
          // Mark finishedAt the moment practice flips to `done`. The
          // user doesn't need to hit 100% accuracy — they just need
          // to reach the end of the passage (pressing space past the
          // last word, in practice's WORDS mode). correctChars stays
          // at whatever they actually typed correctly so the lane bar
          // is honest about their accuracy. rankAndMaybeFinish picks
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
  }
}
