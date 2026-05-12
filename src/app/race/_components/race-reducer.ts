import {
  BOTS_1V3,
  BOT_TICK_MS,
  cumulativeWpm,
  generateRacePassage,
  instantBotWpm,
  RACE_WORDS_1V3,
} from "./race-data";
import type {
  Action,
  FeedEvent,
  Racer,
  RaceState,
  TraceSample,
} from "./race-types";

const FEED_LIMIT = 12;

function buildRacers(): Racer[] {
  const you: Racer = {
    id: "you",
    name: "@you",
    flag: "—",
    badge: "RACER",
    isYou: true,
    bot: null,
    correctChars: 0,
    errorChars: 0,
    wpm: 0,
    finishedAt: null,
    place: null,
    charProgress: 0,
  };
  const bots: Racer[] = BOTS_1V3.map((b) => ({
    id: b.id,
    name: b.name,
    flag: b.flag,
    badge: b.badge,
    isYou: false,
    bot: b,
    correctChars: 0,
    errorChars: 0,
    wpm: 0,
    finishedAt: null,
    place: null,
    charProgress: 0,
  }));
  return [you, ...bots];
}

function buildPassageState(seed: number): {
  words: string[];
  charsBeforeWord: number[];
  totalChars: number;
} {
  const words = generateRacePassage(RACE_WORDS_1V3, seed);
  const charsBeforeWord: number[] = [];
  let acc = 0;
  for (const w of words) {
    charsBeforeWord.push(acc);
    acc += w.length + 1; // +1 for the trailing space committed at word end
  }
  const totalChars = acc - 1; // strip the +1 we added for the final word
  return { words, charsBeforeWord, totalChars };
}

export function freshState(seed: number, now: number): RaceState {
  const { words, charsBeforeWord, totalChars } = buildPassageState(seed);
  return {
    phase: "lobby",
    raceSeed: seed,
    words,
    charsBeforeWord,
    totalChars,
    countdownStartedAt: null,
    raceStartedAt: null,
    raceEndedAt: null,
    nowMs: now,
    racers: buildRacers(),
    feed: [
      { t: 0, who: "race", text: "lobby · 4 racers ready", accent: false },
    ],
    trace: [],
    typedInWord: "",
    lastLeaderId: null,
    milestonesByRacer: {},
  };
}

export function wordIdxFromChars(
  charsBeforeWord: readonly number[],
  correctChars: number,
): number {
  for (let i = charsBeforeWord.length - 1; i >= 0; i--) {
    if (charsBeforeWord[i]! <= correctChars) return i;
  }
  return 0;
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
    if (r.finishedAt != null) return r;
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
  // Skip the very first leader emission — every racer is tied on 0
  // chars and "you" wins ties, which isn't news.
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
    case "START_COUNTDOWN": {
      if (s.phase !== "lobby") return s;
      return { ...s, phase: "countdown", countdownStartedAt: a.now, nowMs: a.now };
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
        // Human: cumulative WPM keeps the lane in sync with the
        // passage readout. Bots: instantaneous WPM + jitter so the
        // trace line looks organic.
        if (r.bot == null) {
          return {
            ...r,
            wpm: Math.round(cumulativeWpm(r.correctChars, elapsedMs)),
          };
        }
        const wpm = instantBotWpm(r.bot, elapsedMs, s.raceSeed);
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
    case "TYPE_CHAR": {
      if (s.phase !== "racing") return s;
      const youIdx = s.racers.findIndex((r) => r.isYou);
      const you = s.racers[youIdx]!;
      if (you.finishedAt != null) return s;
      const wordIdx = wordIdxFromChars(s.charsBeforeWord, you.correctChars);
      if (wordIdx >= s.words.length) return s;
      const word = s.words[wordIdx]!;
      const expected = word[s.typedInWord.length];
      if (expected !== a.ch) {
        const racers = s.racers.map((r, i) =>
          i === youIdx ? { ...r, errorChars: r.errorChars + 1 } : r,
        );
        return { ...s, racers };
      }
      const racers = s.racers.map((r, i) =>
        i === youIdx ? { ...r, correctChars: r.correctChars + 1 } : r,
      );
      return applyPipeline({
        ...s,
        racers,
        typedInWord: s.typedInWord + a.ch,
      });
    }
    case "BACKSPACE": {
      if (s.phase !== "racing") return s;
      const youIdx = s.racers.findIndex((r) => r.isYou);
      const you = s.racers[youIdx]!;
      if (you.finishedAt != null || s.typedInWord.length === 0) return s;
      const racers = s.racers.map((r, i) =>
        i === youIdx
          ? { ...r, correctChars: Math.max(0, r.correctChars - 1) }
          : r,
      );
      return { ...s, racers, typedInWord: s.typedInWord.slice(0, -1) };
    }
    case "SPACE": {
      if (s.phase !== "racing") return s;
      const youIdx = s.racers.findIndex((r) => r.isYou);
      const you = s.racers[youIdx]!;
      if (you.finishedAt != null) return s;
      const wordIdx = wordIdxFromChars(s.charsBeforeWord, you.correctChars);
      if (wordIdx >= s.words.length) return s;
      const word = s.words[wordIdx]!;
      if (s.typedInWord !== word) {
        const racers = s.racers.map((r, i) =>
          i === youIdx ? { ...r, errorChars: r.errorChars + 1 } : r,
        );
        return { ...s, racers };
      }
      // Commit the trailing space unless this is the last word.
      const isLast = wordIdx === s.words.length - 1;
      const racers = s.racers.map((r, i) =>
        i === youIdx && !isLast
          ? { ...r, correctChars: r.correctChars + 1 }
          : r,
      );
      return applyPipeline({ ...s, racers, typedInWord: "" });
    }
    case "RESTART":
      return freshState(a.seed, a.now);
  }
}

