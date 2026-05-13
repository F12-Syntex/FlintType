import { EN_COMMON_1000 } from "@/data/en-common-1000";
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
  readonly raceSeed: number;
  readonly words: readonly string[];
  readonly totalChars: number;
  /** Source attribution for QUOTE rooms; undefined for word-passage
   *  rooms. Broadcast on every snapshot. */
  readonly quoteSource: string | undefined;
  phase: RacePhase = "matching";
  matchmakingStartedAt: number;
  matchmakingEndsAt: number | null = null;
  countdownStartedAt: number | null = null;
  raceStartedAt: number | null = null;
  raceEndedAt: number | null = null;
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
      const next = Math.min(this.totalChars, r.progressChars + whole);
      if (next !== r.progressChars) {
        r.progressChars = next;
        changed = true;
      }
      if (Math.round(wpm) !== r.wpm) {
        r.wpm = Math.round(wpm);
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
    // Pre-race we just drop the seat — no UI value in showing a
    // "(disconnected)" tag for someone who never entered the lobby.
    if (this.phase === "matching" || this.phase === "lobby") {
      this.racers.delete(token);
      this.scheduleBroadcast();
      return;
    }
    // Mid- / post-race: keep the racer in the snapshot, flagged
    // disconnected, so other racers see the slot didn't just vanish.
    // The 5-min idle GC eventually sweeps the room itself.
    r.disconnected = true;
    this.scheduleBroadcast();
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

  private scheduleGc() {
    if (this.gcTimer) return;
    this.gcTimer = setTimeout(() => {
      this.dispose();
    }, ROOM_TTL_MS);
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
      words:
        this.phase === "racing" || this.phase === "finished"
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
  const pool = EN_COMMON_1000.slice(0, 300);
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
