import { EDITS_MAX, SPACES_MAX } from "@/types/capture";
import type {
  BackspaceAction,
  EditEvent,
  KeyEvent,
  SpaceAction,
  SpaceEvent,
  State,
  TypeCharAction,
} from "./practice-reducer";

/** Capture v2 recording (spec-20 §4): pure helpers the reducer's key
 *  branches (`practice-keys.ts`) call when a key changes the run. Only
 *  effective changes are recorded: a no-op (a strict-space block, a
 *  Backspace with nothing to delete, the done phase) leaves the capture
 *  alone. `t` stays on the Date.now clock of `events`; `ht` is the
 *  event's high-resolution timeStamp relative to the run's first
 *  recorded key, used only for gap statistics. */

/** Mark caps. A run that hits either one sets `capped` and is analysed
 *  as v1 (a few missing edits would slip under the replay tolerance). */
export const EDIT_CAP = EDITS_MAX;
export const SPACE_CAP = SPACES_MAX;

/** The wire bound for `t` and `ht` (24 hours). */
const CLOCK_MAX_MS = 86_400_000;

/** One decimal place; `+ 0` turns a -0 into 0. */
const round1 = (x: number): number => Math.round(x * 10) / 10 + 0;

/** The key's `ht`, relative to the run's first recorded key, and the
 *  origin to keep. A missing, zero or non-finite timeStamp records no
 *  `ht`; so does one before the origin or past the wire bound. */
export function stampHt(s: State, ht: number | undefined): { ht?: number; htOrigin: number | null } {
  if (typeof ht !== "number" || !Number.isFinite(ht) || ht <= 0) {
    return { htOrigin: s.htOrigin ?? null };
  }
  const origin = s.htOrigin ?? ht;
  const rel = round1(ht - origin);
  return rel >= 0 && rel <= CLOCK_MAX_MS ? { ht: rel, htOrigin: origin } : { htOrigin: origin };
}

/** A DOM event's timeStamp for `ht`, or undefined when the browser
 *  gives none (0 on some synthetic events). */
export function eventStamp(e: { timeStamp: number }): number | undefined {
  return Number.isFinite(e.timeStamp) && e.timeStamp > 0 ? e.timeStamp : undefined;
}

/** "input" for a keydown with no physical key code: an on-screen key.
 *  iOS sends a real `key` for soft-keyboard presses, but WebKit only has
 *  a key code for hardware keys, so `code` is "Unidentified" (some
 *  browsers send ""). Such a key is recorded like soft-keyboard text. */
export function keydownSrc(e: { code: string }): "input" | undefined {
  return e.code === "" || e.code === "Unidentified" ? "input" : undefined;
}

/** For a keydown of one letter a–z / A–Z: whether its physical key code
 *  is that letter's QWERTY key. Undefined for every other key, and for
 *  an on-screen key (no code says nothing about the layout), so only
 *  physical letters count towards `layoutHits` (never which keys were
 *  pressed). */
export function letterCodeOk(e: { key: string; code: string }): boolean | undefined {
  if (!/^[a-z]$/i.test(e.key) || keydownSrc(e)) return undefined;
  return e.code === `Key${e.key.toUpperCase()}`;
}

/** The next mark's order across both arrays. Marks are only ever
 *  appended, so it is unique and strictly increasing within a run. */
export function nextSeq(s: State): number {
  return (s.edits?.length ?? 0) + (s.spaces?.length ?? 0);
}

/** `layoutHits` after one letter keydown. `codeOk` is undefined for
 *  anything that isn't a keydown of a–z (soft-keyboard text, IME,
 *  symbols), which leaves the count alone. */
export function countLayoutHit(s: State, codeOk: boolean | undefined): State["layoutHits"] {
  if (codeOk === undefined) return s.layoutHits;
  const [letters, matches] = s.layoutHits ?? [0, 0];
  return [letters + 1, matches + (codeOk ? 1 : 0)];
}

/** A char event with its v2 fields (`pos`, `src`, `ht`), plus the
 *  State fields the key moves: the ht origin and the layout count. */
export function captureChar(
  s: State,
  a: TypeCharAction,
  base: Omit<KeyEvent, "pos" | "src" | "ht">,
): { event: KeyEvent; capture: Pick<State, "htOrigin" | "layoutHits"> } {
  const { ht, htOrigin } = stampHt(s, a.ht);
  const event: KeyEvent = {
    ...base,
    pos: s.cursorChar,
    ...(a.src === "input" ? { src: "input" as const } : {}),
    ...(ht !== undefined ? { ht } : {}),
  };
  return { event, capture: { htOrigin, layoutHits: countLayoutHit(s, a.codeOk) } };
}

/** Fields every mark shares, from the State before it applied. */
function markBase(prev: State, t: number, a: { ht?: number; src?: "input" }) {
  const { ht, htOrigin } = stampHt(prev, a.ht);
  return {
    htOrigin,
    mark: {
      t: Math.max(0, t),
      ...(ht !== undefined ? { ht } : {}),
      at: prev.events.length,
      seq: nextSeq(prev),
      wordIndex: prev.cursorWord,
      pos: prev.cursorChar,
      ...(a.src === "input" ? { src: "input" as const } : {}),
    },
  };
}

/** Records an applied Space. `next` is the reducer's result for `prev`;
 *  the same reference means the Space was a no-op. A first-key Space
 *  records t = 0 (it starts the clock). */
export function recordSpace(prev: State, next: State, a: SpaceAction): State {
  if (next === prev || prev.phase === "done") return next;
  const spaces = prev.spaces ?? [];
  if (spaces.length >= SPACE_CAP) return { ...next, capped: true };
  const start = next.startTime ?? a.now;
  const { mark, htOrigin } = markBase(prev, a.now - start, a);
  const early = (prev.typed[prev.cursorWord] ?? "") !== (prev.words[prev.cursorWord] ?? "");
  const space: SpaceEvent = { ...mark, ...(early ? { early: true as const } : {}) };
  return { ...next, spaces: [...spaces, space], htOrigin };
}

/** Records an applied Backspace or word delete. `cross` marks one that
 *  moved the cursor back into the previous word. Old callers send no
 *  `now`, so the time falls back to Date.now (only the record needs it). */
export function recordEdit(
  prev: State,
  next: State,
  a: BackspaceAction,
  kind: "back" | "backWord",
): State {
  if (next === prev || prev.startTime == null) return next;
  const edits = prev.edits ?? [];
  if (edits.length >= EDIT_CAP) return { ...next, capped: true };
  const { mark, htOrigin } = markBase(prev, (a.now ?? Date.now()) - prev.startTime, a);
  const edit: EditEvent = {
    ...mark,
    kind,
    ...(next.cursorWord < prev.cursorWord ? { cross: true as const } : {}),
  };
  return { ...next, edits: [...edits, edit], htOrigin };
}

/** The marks moved by the same shift as the events when the race gun
 *  anchors a clock that started late. `ht` is left alone: it is relative
 *  to the first key, not to the clock start. */
export function shiftCapture(s: State, shiftMs: number): Pick<State, "edits" | "spaces"> {
  const out: Pick<State, "edits" | "spaces"> = {};
  if (s.edits) out.edits = s.edits.map((e) => ({ ...e, t: e.t + shiftMs }));
  if (s.spaces) out.spaces = s.spaces.map((x) => ({ ...x, t: x.t + shiftMs }));
  return out;
}

/** A fresh run's capture: empty marks, no origin, no layout count. */
export function freshCapture(): Pick<State, "edits" | "spaces" | "htOrigin" | "layoutHits" | "capped"> {
  return { edits: [], spaces: [], htOrigin: null, layoutHits: [0, 0], capped: false };
}
