import englishWords from "@/data/english.json";
import type {
  RaceModeId,
  RacePhase,
  RaceRoomKind,
  RoomRacer,
  RoomSnapshot,
} from "@/types/race";
import {
  BOTS,
  BOT_LINEUP,
  botMistakesChar,
  capacityFor,
  instantBotWpm,
  type BotId,
  type BotProfile,
} from "./bots";

/** Server-authoritative race-room state machine. Owns the phase
 *  timeline (matching → lobby → countdown → racing → finished),
 *  schedules per-second bot fills during matchmaking, runs the bot
 *  WPM tick during racing, and broadcasts snapshots to every
 *  subscribed SSE connection.
 *
 *  Real-player priority is handled by ordering only — when a bot
 *  fill timer fires, it first checks if the room is full from real
 *  joiners; if so it stays out. The schedule itself doesn't care
 *  about who joined, just how many seats are open.
 *
 *  Why all in one class: the timers / subscribers / state are deeply
 *  coupled and live for the room's lifetime. Splitting them across
 *  modules would mean threading the same `state` object through every
 *  call site. */

const MATCHMAKING_WINDOW_MS = 5_000;
const BOT_JOIN_INTERVAL_MS = 1_000;
const LOBBY_HOLD_MS = 700;
const COUNTDOWN_MS = 3_000;
const BOT_TICK_MS = 100; // 10 Hz
const BROADCAST_THROTTLE_MS = 80; // ~12 Hz max
const ROOM_TTL_MS = 5 * 60_000;
/** Challenge rooms keep their slug alive until the host actively
 *  leaves or cancels. This is the safety net for the host's tab
 *  disappearing without firing `leave` (crash, kill-process,
 *  network loss long enough to drop the SSE without a clean
 *  beforeunload). Sliding window — resets on any racer activity
 *  (join, keystroke, rematch). 30 min is enough that no honest
 *  lobby-link share gets killed; short enough that abandoned rooms
 *  don't leak the in-memory store. */
const CHALLENGE_HOST_IDLE_TTL_MS = 30 * 60_000;

type InternalRacer = RoomRacer & {
  sessionToken: string;
  botProfile?: BotProfile;
  /** Fractional progress accumulator for bots so sub-1-char per-tick
   *  advances still produce smooth movement. */
  botCharProgress: number;
};

type Subscriber = (snapshot: RoomSnapshot) => void;

export type RoomOptions = {
  id: string;
  slug: string | null;
  kind: RaceRoomKind;
  modeId: RaceModeId;
  /** Deterministic seed for passage generation + bot motion. */
  raceSeed: number;
  /** Word count for the passage. Ignored when `quoteText` is set —
   *  the quote determines the passage. */
  wordCount?: number;
  /** When set, the room runs a QUOTE race: the passage is this
   *  exact string, split on whitespace into words, and the source
   *  flows out via every snapshot for the client attribution line. */
  quoteText?: string;
  quoteSource?: string;
  /** Fires when the room's last activity is older than ROOM_TTL_MS
   *  AND the room is finished — the store uses this to GC. */
  onIdle?: () => void;
};

export class RaceRoom {
  readonly id: string;
  readonly slug: string | null;
  readonly kind: RaceRoomKind;
  readonly modeId: RaceModeId;
  readonly capacity: number;
  /** Mutable on rematch — every new round re-rolls the passage with a
   *  fresh seed so word-passage racers don't replay the same line. */
  raceSeed: number;
  words: readonly string[];
  totalChars: number;
  /** Source attribution for QUOTE rooms; undefined for word-passage
   *  rooms. Broadcast on every snapshot. Quote rooms keep the same
   *  quote across rematches — the room *is* about that quote. */
  readonly quoteSource: string | undefined;
  phase: RacePhase = "matching";
  matchmakingStartedAt: number;
  matchmakingEndsAt: number | null = null;
  countdownStartedAt: number | null = null;
  raceStartedAt: number | null = null;
  raceEndedAt: number | null = null;
  /** 1-indexed round counter. Bumps each time `startNewRound` fires.
   *  Clients watch this for "the room transitioned to a new race" so
   *  they can reset their practice / race providers cleanly. */
  roundNumber = 1;
  /** Session tokens of real players who've voted to rematch since the
   *  current round finished. Bots count as implicitly ready (we never
   *  store them here). Cleared by `startNewRound`. */
  private readonly rematchReady = new Set<string>();
  /** Set true the moment the challenge host fires `hostCancel`. The
   *  next (and final) snapshot carries this flag so every connected
   *  client knows to bounce back to /race. */
  private cancelled = false;
  lastTouchedAt: number;
  private readonly racers = new Map<string, InternalRacer>();
  private readonly subs = new Set<Subscriber>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private botTickInterval: ReturnType<typeof setInterval> | null = null;
  private lastBroadcastAt = 0;
  private pendingBroadcast: ReturnType<typeof setTimeout> | null = null;
  private nextPlace = 1;
  private gcTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly options: RoomOptions;

  constructor(options: RoomOptions) {
    this.options = options;
    this.id = options.id;
    this.slug = options.slug;
    this.kind = options.kind;
    this.modeId = options.modeId;
    this.capacity = capacityFor(options.modeId);
    this.raceSeed = options.raceSeed;
    if (options.quoteText != null) {
      this.words = options.quoteText.split(/\s+/).filter(Boolean);
      this.quoteSource = options.quoteSource;
    } else {
      this.words = generateRacePassage(options.wordCount ?? 25, options.raceSeed);
      this.quoteSource = undefined;
    }
    this.totalChars = totalCharsOf(this.words);
    this.matchmakingStartedAt = Date.now();
    this.lastTouchedAt = this.matchmakingStartedAt;
    // Challenge rooms skip the matchmaking auto-fill — host invites
    // a real player and presses Start when ready. Matchmaking rooms
    // run the 5s auto-fill schedule.
    if (this.kind === "matchmaking") {
      this.scheduleMatchmakingFill();
    } else {
      this.phase = "lobby";
      // Arm the sliding-window idle timer from creation so a host who
      // creates a lobby and walks away without ever starting / cancelling
      // doesn't leak the room. Resets itself on every activity bump.
      this.scheduleChallengeIdleGc();
    }
  }

  /* ─── Subscribers ─────────────────────────────────────────── */

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    // Push the current snapshot immediately so the new subscriber
    // doesn't sit blank until the next state change.
    fn(this.snapshot());
    return () => {
      this.subs.delete(fn);
    };
  }

  /* ─── Joining ─────────────────────────────────────────────── */

  /** True iff the room can still accept a real joiner. Matchmaking
   *  rooms are open during the matching phase; challenge rooms are
   *  open during their lobby phase (host invites a real player; they
   *  join the lobby until the host clicks Start). */
  canJoinAsReal(): boolean {
    if (this.racers.size >= this.capacity) return false;
    if (this.kind === "matchmaking") return this.phase === "matching";
    return this.phase === "lobby";
  }

  addRealRacer(opts: {
    sessionToken: string;
    name: string;
    badge: string;
    isHost?: boolean;
  }): InternalRacer | null {
    // Re-join after a transient disconnect: same sessionToken, same
    // seat. Clear the disconnected flag so the snapshot stops showing
    // the "(disconnected)" tag on a player who came back.
    const existing = this.racers.get(opts.sessionToken);
    if (existing && !existing.isBot) {
      existing.disconnected = false;
      this.lastTouchedAt = Date.now();
      this.scheduleBroadcast();
      return existing;
    }
    if (!this.canJoinAsReal()) return null;
    const now = Date.now();
    const racer: InternalRacer = {
      id: opts.sessionToken,
      sessionToken: opts.sessionToken,
      name: opts.name,
      flag: "—",
      badge: opts.badge,
      isBot: false,
      isHost: opts.isHost ?? false,
      joinedAt: now,
      progressChars: 0,
      errors: 0,
      wpm: 0,
      accuracy: 100,
      finishedAt: null,
      place: null,
      botCharProgress: 0,
      disconnected: false,
    };
    this.racers.set(racer.id, racer);
    this.lastTouchedAt = now;
    this.maybeStartLobby();
    this.scheduleBroadcast();
    return racer;
  }

  private addBot(botId: BotId): InternalRacer | null {
    if (this.racers.size >= this.capacity) return null;
    if (this.botRacerByBotId(botId)) return null;
    const bot = BOTS[botId];
    if (!bot) return null;
    const now = Date.now();
    const racer: InternalRacer = {
      id: `bot:${botId}`,
      sessionToken: `bot:${botId}`,
      name: bot.name,
      flag: bot.flag,
      badge: bot.badge,
      isBot: true,
      isHost: false,
      joinedAt: now,
      progressChars: 0,
      errors: 0,
      wpm: 0,
      accuracy: 100,
      finishedAt: null,
      place: null,
      botProfile: bot,
      botCharProgress: 0,
      disconnected: false,
    };
    this.racers.set(racer.id, racer);
    this.lastTouchedAt = now;
    this.scheduleBroadcast();
    return racer;
  }

  private botRacerByBotId(botId: BotId): InternalRacer | null {
    return this.racers.get(`bot:${botId}`) ?? null;
  }

  /* ─── Matchmaking ────────────────────────────────────────── */

  private scheduleMatchmakingFill() {
    const fillBots = BOT_LINEUP[this.modeId] ?? ["selan"];
    this.matchmakingEndsAt = this.matchmakingStartedAt + MATCHMAKING_WINDOW_MS;
    for (let i = 0; i < fillBots.length; i += 1) {
      const delay = (i + 1) * BOT_JOIN_INTERVAL_MS;
      const botId = fillBots[i]!;
      const t = setTimeout(() => {
        this.timers.delete(t);
        if (this.phase !== "matching") return;
        // Real-player priority: only add this bot if seats are still
        // open. If real players have filled the room, the bot stays out.
        if (this.racers.size >= this.capacity) return;
        this.addBot(botId);
        this.maybeStartLobby();
      }, delay);
      this.timers.add(t);
    }
    // Final 5s lock — fill remaining seats with any bots not already
    // present, in lineup order. Then flip to lobby.
    const lockT = setTimeout(() => {
      this.timers.delete(lockT);
      if (this.phase !== "matching") return;
      for (const botId of fillBots) {
        if (this.racers.size >= this.capacity) break;
        if (!this.botRacerByBotId(botId)) this.addBot(botId);
      }
      this.transitionToLobby();
    }, MATCHMAKING_WINDOW_MS);
    this.timers.add(lockT);
  }

  private maybeStartLobby() {
    if (this.phase !== "matching") return;
    if (this.racers.size >= this.capacity) {
      this.transitionToLobby();
    }
  }

  private transitionToLobby() {
    if (this.phase === "lobby") return;
    this.phase = "lobby";
    this.matchmakingEndsAt = null;
    this.cancelTimers();
    this.scheduleLobbyHold();
  }

  /** Challenge host triggered cancel. Valid in any phase before
   *  `finished` — the host can wipe a lobby they no longer want OR
   *  abort a countdown / live race. Broadcasts one final snapshot
   *  with `cancelled: true` so every subscriber knows to redirect,
   *  then disposes the room (which frees the slug + clears timers).
   *  Only the host can call this; non-hosts get a false return. */
  hostCancel(token: string): boolean {
    if (this.kind !== "challenge") return false;
    if (this.phase === "finished") return false;
    const caller = this.racers.get(token);
    if (!caller || !caller.isHost) return false;
    this.cancelled = true;
    // Use the synchronous flush directly — `scheduleBroadcast` might
    // defer the snapshot past `dispose()`, which clears the
    // subscriber set and silently drops every pending message.
    this.flushBroadcast();
    this.dispose();
    return true;
  }

  /** Challenge host triggered start. Fills with bots to capacity then
   *  kicks off the lobby-hold → countdown → race sequence. Idempotent
   *  per host call: subsequent calls in lobby are no-ops because the
   *  pending lobby-hold timer is already queued. */
  hostStart(token: string): boolean {
    if (this.phase !== "lobby" && this.phase !== "matching") return false;
    const host = this.racers.get(token);
    if (!host || !host.isHost) return false;
    const fill = BOT_LINEUP[this.modeId] ?? ["selan"];
    for (const botId of fill) {
      if (this.racers.size >= this.capacity) break;
      if (!this.botRacerByBotId(botId)) this.addBot(botId);
    }
    this.cancelTimers();
    if (this.phase === "matching") {
      this.transitionToLobby();
    } else {
      // Already in lobby (challenge rooms construct here). Schedule
      // the lobby-hold → countdown beat directly.
      this.scheduleLobbyHold();
    }
    return true;
  }

  private scheduleLobbyHold() {
    const t = setTimeout(() => {
      this.timers.delete(t);
      this.startCountdown();
    }, LOBBY_HOLD_MS);
    this.timers.add(t);
    this.scheduleBroadcast();
  }

  /* ─── Countdown + racing ─────────────────────────────────── */

  private startCountdown() {
    if (this.phase !== "lobby") return;
    this.phase = "countdown";
    this.countdownStartedAt = Date.now();
    const t = setTimeout(() => {
      this.timers.delete(t);
      this.startRacing();
    }, COUNTDOWN_MS);
    this.timers.add(t);
    this.scheduleBroadcast();
  }

  private startRacing() {
    if (this.phase !== "countdown") return;
    this.phase = "racing";
    this.raceStartedAt = Date.now();
    this.botTickInterval = setInterval(() => this.tickBots(), BOT_TICK_MS);
    this.scheduleBroadcast();
  }

  private tickBots() {
    if (this.phase !== "racing" || this.raceStartedAt == null) return;
    const now = Date.now();
    const elapsedMs = now - this.raceStartedAt;
    const dtSec = BOT_TICK_MS / 1000;
    let changed = false;
    for (const r of this.racers.values()) {
      if (!r.isBot || !r.botProfile || r.finishedAt != null) continue;
      const wpm = instantBotWpm(r.botProfile, elapsedMs, this.raceSeed);
      const charsThisTick = (wpm / 60) * 5 * dtSec;
      const totalProg = r.botCharProgress + charsThisTick;
      const whole = Math.floor(totalProg);
      r.botCharProgress = totalProg - whole;
      const prevProgress = r.progressChars;
      const next = Math.min(this.totalChars, prevProgress + whole);
      // Per-char error roll. Each char the bot "types" this tick has
      // a (1 - accuracyTarget) chance of being a mistype. Errors
      // accumulate into the same `errors` counter real players publish,
      // and the live accuracy percent is derived from it. Seeded by
      // the (botId, raceSeed, charIndex) tuple inside `botMistakesChar`
      // so a replay of the same race produces identical error placement.
      if (next > prevProgress && r.botProfile.accuracyTarget < 1) {
        for (let i = prevProgress; i < next; i += 1) {
          if (botMistakesChar(r.botProfile, i, this.raceSeed)) {
            r.errors += 1;
            changed = true;
          }
        }
      }
      if (next !== prevProgress) {
        r.progressChars = next;
        changed = true;
      }
      // Display WPM — cumulative, not the per-tick instant value. The
      // instantBotWpm function drives the progress simulation (chars
      // advanced this tick) and naturally jitters ±noiseWpm every
      // 100ms; surfacing that raw number in the lineup panel made it
      // flicker badly ("a bot reads 17 wpm one frame and 60 the
      // next"). Cumulative = correct chars / 5 / elapsed-minutes is
      // the same formula real players publish, so the two are
      // apples-to-apples for at-a-glance comparison.
      const elapsedSec = Math.max(1, elapsedMs / 1000);
      const correctProgress = Math.max(0, r.progressChars - r.errors);
      const cumulativeWpm = Math.round(
        (correctProgress / 5) * (60 / elapsedSec),
      );
      if (cumulativeWpm !== r.wpm) {
        r.wpm = cumulativeWpm;
        changed = true;
      }
      // Live accuracy = correct / typed * 100, clamped to [0, 100].
      // `progressChars` is the cursor-position char count; errors are
      // accumulated alongside it, so the ratio is honest.
      const typed = Math.max(1, r.progressChars);
      const acc = Math.round(((typed - r.errors) / typed) * 1000) / 10;
      const clampedAcc = Math.max(0, Math.min(100, acc));
      if (clampedAcc !== r.accuracy) {
        r.accuracy = clampedAcc;
        changed = true;
      }
      if (r.progressChars >= this.totalChars && r.finishedAt == null) {
        r.finishedAt = Math.floor((now - this.raceStartedAt) / 1000);
        r.place = this.nextPlace++;
        changed = true;
      }
    }
    this.maybeFinishRace(now);
    if (changed) this.scheduleBroadcast();
  }

  /* ─── Real-player progress ───────────────────────────────── */

  setProgress(
    token: string,
    progressChars: number,
    wpm: number,
    finished: boolean,
    errors?: number,
    accuracy?: number,
  ): boolean {
    const r = this.racers.get(token);
    if (!r || r.isBot) return false;
    if (this.phase !== "racing" && this.phase !== "finished") return false;
    const next = Math.min(this.totalChars, Math.max(0, Math.floor(progressChars)));
    if (next !== r.progressChars) r.progressChars = next;
    if (wpm !== r.wpm) r.wpm = wpm;
    if (errors != null) {
      const e = Math.max(0, Math.floor(errors));
      if (e !== r.errors) r.errors = e;
    }
    if (accuracy != null) {
      const a = Math.max(0, Math.min(100, accuracy));
      if (a !== r.accuracy) r.accuracy = a;
    }
    // A real player publishing progress is implicitly here — clear
    // any prior disconnected flag set by a stale leave / strict-mode
    // unmount.
    if (r.disconnected) r.disconnected = false;
    if (
      r.finishedAt == null &&
      (finished || r.progressChars >= this.totalChars) &&
      this.raceStartedAt != null
    ) {
      r.finishedAt = Math.floor((Date.now() - this.raceStartedAt) / 1000);
      r.place = this.nextPlace++;
    }
    this.lastTouchedAt = Date.now();
    this.maybeFinishRace(Date.now());
    this.scheduleBroadcast();
    return true;
  }

  /* ─── Lifecycle ──────────────────────────────────────────── */

  removeRacer(token: string): void {
    const r = this.racers.get(token);
    if (!r) return;
    if (r.isBot) {
      // Bots are server-owned. They never `leave`; if something
      // dispatches removeRacer with a bot id (defensive), drop them
      // outright so the lobby count stays honest.
      this.racers.delete(token);
      this.scheduleBroadcast();
      return;
    }
    const wasChallengeHost = this.kind === "challenge" && r.isHost;
    // Pre-race we drop the seat outright — no UI value in showing a
    // "(disconnected)" tag for someone who never entered the lobby.
    // Mid/post-race we keep the racer in the snapshot but flag them
    // disconnected so other racers see the slot didn't vanish.
    if (this.phase === "matching" || this.phase === "lobby") {
      this.racers.delete(token);
    } else {
      r.disconnected = true;
    }
    // Challenge host migration. When the host leaves we promote the
    // next eligible real racer to host instead of cancelling the
    // room — a lobby with a live invite link shouldn't die just
    // because the original opener walked away. Only when no real
    // active racer remains do we tear the room down (slug freed,
    // subscribers redirected via `cancelled`).
    //
    // Eligibility: real player (not a bot) who is still connected.
    // Order: by joinedAt, so the longest-tenured remaining racer
    // becomes host — closest to "next in line."
    if (wasChallengeHost) {
      const successor = this.pickNewHost(token);
      if (successor) {
        // Exactly one host at any moment — clear the leaver's flag
        // first so a mid-race disconnected ex-host doesn't render as
        // a second host badge in the snapshot.
        r.isHost = false;
        successor.isHost = true;
        this.lastTouchedAt = Date.now();
      }
    }
    // Late-leave dispose: any leave that empties out a challenge
    // room of real active racers (host migration found no successor,
    // or a non-host's leave was the last one out) frees the slug
    // now rather than waiting on the 30-min idle GC. Matchmaking
    // rooms keep their existing GC path — they have no slug to
    // reclaim and the 5-min idle sweep already handles them.
    if (this.kind === "challenge" && !this.hasRealActiveRacer()) {
      this.cancelled = true;
      this.flushBroadcast();
      this.dispose();
      return;
    }
    this.scheduleBroadcast();
  }

  /** Pick the next real, still-connected racer to inherit the host
   *  bit. Returns null when nobody qualifies — the caller treats
   *  that as "the room is empty of real users, dispose it." */
  private pickNewHost(excludingToken: string): InternalRacer | null {
    let best: InternalRacer | null = null;
    for (const r of this.racers.values()) {
      if (r.id === excludingToken) continue;
      if (r.isBot || r.disconnected) continue;
      if (best == null || r.joinedAt < best.joinedAt) best = r;
    }
    return best;
  }

  /** True iff at least one real, connected racer is still in the
   *  room. Used by `removeRacer` to decide whether a challenge room
   *  is now empty enough to free its slug. */
  private hasRealActiveRacer(): boolean {
    for (const r of this.racers.values()) {
      if (!r.isBot && !r.disconnected) return true;
    }
    return false;
  }

  private maybeFinishRace(now: number) {
    if (this.phase !== "racing") return;
    const allDone = [...this.racers.values()].every((r) => r.finishedAt != null);
    if (!allDone) return;
    this.phase = "finished";
    this.raceEndedAt = now;
    if (this.botTickInterval) {
      clearInterval(this.botTickInterval);
      this.botTickInterval = null;
    }
    this.scheduleGc();
  }

  /* ─── Rematch ────────────────────────────────────────────── */

  /** Mark a real player as ready for a rematch. Idempotent. Returns
   *  `{ ok: false }` for unknown tokens / bots / wrong phase, or
   *  `{ ok: true, started: <bool> }` where `started=true` means this
   *  vote met threshold and the new round is already in motion.
   *
   *  Threshold:
   *    - In a room with one real player (the rest are bots), one
   *      ready vote is enough — the bots count as the second
   *      "player" so a 1v1 / 1v1v1v1 user can rematch instantly.
   *    - In a room with two+ real players, we need at least two
   *      ready votes before kicking off the new round. The room
   *      doesn't auto-include bots in the multi-real count to avoid
   *      starting a race before any human is actually ready. */
  markRematchReady(token: string): { ok: boolean; started: boolean } {
    if (this.phase !== "finished" || this.cancelled) {
      return { ok: false, started: false };
    }
    const racer = this.racers.get(token);
    if (!racer || racer.isBot || racer.disconnected) {
      return { ok: false, started: false };
    }
    this.rematchReady.add(token);
    this.lastTouchedAt = Date.now();
    const realCount = [...this.racers.values()].filter(
      (r) => !r.isBot && !r.disconnected,
    ).length;
    const required = Math.max(1, Math.min(2, realCount));
    if (this.rematchReady.size >= required) {
      this.startNewRound();
      return { ok: true, started: true };
    }
    this.scheduleBroadcast();
    return { ok: true, started: false };
  }

  /** Reset every racer's progress, regenerate the passage (word-mode
   *  only; quote rooms keep their quote), and run the room back
   *  through lobby → countdown → racing. Bumps `roundNumber` so
   *  every connected client knows to reset its practice / race
   *  provider for the new passage. */
  private startNewRound() {
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    if (this.botTickInterval) {
      clearInterval(this.botTickInterval);
      this.botTickInterval = null;
    }
    this.cancelTimers();
    // Re-roll the passage. Quote rooms keep the same quote text (the
    // room is "about" that quote) so we read from options.quoteText
    // when present; everything else regenerates from a derived seed
    // so two consecutive rounds don't reproduce the same word list.
    this.raceSeed = (this.raceSeed * 31 + Date.now() + this.roundNumber) | 0;
    if (this.options.quoteText != null) {
      this.words = this.options.quoteText.split(/\s+/).filter(Boolean);
    } else {
      this.words = generateRacePassage(
        this.options.wordCount ?? 25,
        this.raceSeed,
      );
    }
    this.totalChars = totalCharsOf(this.words);
    // Reset per-racer state — keep identity (id / name / flag / badge
    // / isHost / isBot / botProfile) but wipe everything race-bound.
    for (const r of this.racers.values()) {
      r.progressChars = 0;
      r.errors = 0;
      r.wpm = 0;
      r.accuracy = 100;
      r.finishedAt = null;
      r.place = null;
      r.botCharProgress = 0;
    }
    this.rematchReady.clear();
    this.nextPlace = 1;
    this.raceStartedAt = null;
    this.raceEndedAt = null;
    this.countdownStartedAt = null;
    this.roundNumber += 1;
    this.phase = "lobby";
    this.scheduleLobbyHold();
  }

  private scheduleGc() {
    if (this.gcTimer) return;
    // Challenge rooms intentionally outlive the post-finish window so
    // the lobby link (slug) stays valid for late joiners until the
    // host explicitly leaves or cancels. The only thing that GCs a
    // challenge room from this codepath is the host abandoning their
    // tab without firing `leave` (crash, kill); for that we run a
    // longer sliding-window timer keyed off `lastTouchedAt`.
    if (this.kind === "challenge") {
      this.scheduleChallengeIdleGc();
      return;
    }
    this.gcTimer = setTimeout(() => {
      this.dispose();
    }, ROOM_TTL_MS);
  }

  /** Re-arms the sliding-window idle timer for a challenge room.
   *  Called from every activity touchpoint (join, keystroke, finish,
   *  rematch). If the host is connected and racers are still in the
   *  room, the timer keeps getting pushed forward indefinitely — the
   *  slug stays alive. Only fires when the room sits idle for the
   *  full window with no host action. */
  private scheduleChallengeIdleGc() {
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    this.gcTimer = setTimeout(() => {
      this.gcTimer = null;
      const idleFor = Date.now() - this.lastTouchedAt;
      if (idleFor >= CHALLENGE_HOST_IDLE_TTL_MS) {
        this.dispose();
        return;
      }
      // Activity happened since the timer was armed — push it out.
      this.scheduleChallengeIdleGc();
    }, CHALLENGE_HOST_IDLE_TTL_MS);
  }

  dispose() {
    this.cancelTimers();
    if (this.botTickInterval) {
      clearInterval(this.botTickInterval);
      this.botTickInterval = null;
    }
    if (this.gcTimer) {
      clearTimeout(this.gcTimer);
      this.gcTimer = null;
    }
    this.subs.clear();
    this.options.onIdle?.();
  }

  private cancelTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  /* ─── Snapshot + broadcast ───────────────────────────────── */

  snapshot(): RoomSnapshot {
    const racers: RoomRacer[] = [...this.racers.values()].map((r) => ({
      id: r.id,
      name: r.name,
      flag: r.flag,
      badge: r.badge,
      isBot: r.isBot,
      isHost: r.isHost,
      joinedAt: r.joinedAt,
      progressChars: r.progressChars,
      errors: r.errors,
      wpm: r.wpm,
      accuracy: r.accuracy,
      finishedAt: r.finishedAt,
      place: r.place,
      disconnected: r.disconnected,
    }));
    return {
      roomId: this.id,
      slug: this.slug,
      kind: this.kind,
      modeId: this.modeId,
      phase: this.phase,
      // Words gating: hide the passage during the first match's
      // pre-race phases (matching/lobby/countdown) so nobody pre-
      // reads. For rematches (roundNumber > 1) the racers are already
      // in the same room and have all just seen each other's last
      // round — fairness is already established, and emitting the
      // words during the rematch lobby+countdown is what lets the
      // client re-key its practice + race providers before the new
      // round starts racing. Without this, the client only learns
      // about the new round when phase=racing arrives, the re-mount
      // happens mid-race, and "rematch kind of just ends" (the
      // client jumps from finished to mid-racing with no countdown
      // beat in between).
      words:
        this.phase === "racing" ||
        this.phase === "finished" ||
        this.roundNumber > 1
          ? this.words
          : undefined,
      totalChars: this.totalChars,
      serverNowMs: Date.now(),
      matchmakingEndsAt: this.matchmakingEndsAt,
      countdownStartedAt: this.countdownStartedAt,
      raceStartedAt: this.raceStartedAt,
      raceEndedAt: this.raceEndedAt,
      racers,
      cancelled: this.cancelled || undefined,
      quoteSource: this.quoteSource,
      roundNumber: this.roundNumber,
      rematchReady: [...this.rematchReady],
    };
  }

  /** Coalesce broadcasts so a flurry of progress updates only goes
   *  out at the throttle rate. The trailing flush guarantees the
   *  *latest* state lands even if we suppress an earlier one. */
  private scheduleBroadcast() {
    const now = Date.now();
    const since = now - this.lastBroadcastAt;
    if (since >= BROADCAST_THROTTLE_MS) {
      this.flushBroadcast();
      return;
    }
    if (this.pendingBroadcast) return;
    this.pendingBroadcast = setTimeout(
      () => {
        this.pendingBroadcast = null;
        this.flushBroadcast();
      },
      BROADCAST_THROTTLE_MS - since,
    );
  }

  private flushBroadcast() {
    this.lastBroadcastAt = Date.now();
    const snap = this.snapshot();
    for (const fn of this.subs) {
      try {
        fn(snap);
      } catch {
        // A failed subscriber must not break the others.
      }
    }
  }
}

/* ─── Passage helpers ─────────────────────────────────────── */

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateRacePassage(count: number, seed: number): string[] {
  const rng = mulberry32(seed);
  // Multiplayer pulls from the same MonkeyType `english.json` word
  // pool the single-player English mode uses — the words a racer
  // sees in a public room are the words they practice against in
  // their own tests.
  const pool: readonly string[] = englishWords.words;
  const out: string[] = [];
  let prev = "";
  while (out.length < count) {
    const w = pool[Math.floor(rng() * pool.length)]!;
    if (w === prev) continue;
    out.push(w);
    prev = w;
  }
  return out;
}

function totalCharsOf(words: readonly string[]): number {
  if (words.length === 0) return 0;
  let n = words.length - 1;
  for (const w of words) n += w.length;
  return n;
}
