"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  type FingerId,
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  useHandLayout,
} from "@/lib/hand-layout";
import { cn } from "@/lib/utils";
import { Keyboard, type KeyboardProps } from "./index";

/** Pixel rect of a key, relative to the container. */
type Rect = { x: number; y: number; w: number; h: number };
type Pt = { x: number; y: number };
type Pointer = { x: number; y: number };

/** Per-finger thickness pair (base, tip) — tapered so each finger reads
 *  like an actual finger silhouette rather than a uniform stick. Tuned
 *  against the default keyboard key size; the SVG scales naturally
 *  with the rest of the popover so these numbers don't need to flex. */
const FINGER_WIDTH: Record<FingerId, { base: number; tip: number }> = {
  L5: { base: 18, tip: 13 }, // pinky
  L4: { base: 22, tip: 16 }, // ring
  L3: { base: 24, tip: 17 }, // middle
  L2: { base: 23, tip: 17 }, // index
  L1: { base: 28, tip: 21 }, // thumb
  R1: { base: 28, tip: 21 },
  R2: { base: 23, tip: 17 },
  R3: { base: 24, tip: 17 },
  R4: { base: 22, tip: 16 },
  R5: { base: 18, tip: 13 },
};

const DRAG_THRESHOLD_PX = 5;

/** Display name for a key code — strips the "Key" / "Digit" prefix and
 *  prints punctuation symbols literally so the finger badges read as
 *  the actual character the finger sits on. */
function prettyKey(code: string): string {
  if (code === "Space") return "␣";
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const map: Record<string, string> = {
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backslash: "\\",
    BracketLeft: "[",
    BracketRight: "]",
    Minus: "-",
    Equal: "=",
    Backquote: "`",
  };
  return map[code] ?? code;
}

type DragState = {
  finger: FingerId;
  pointer: Pointer;
  /** True once the pointer moved past the drag threshold — disambiguates
   *  click (toggle enabled) from drag (reassign home key). */
  active: boolean;
  start: Pointer;
};

/** Wraps `<Keyboard />` with an interactive hand-layout editor. Two
 *  ghost hands are drawn directly on top of the keyboard — palm shapes
 *  below the home row, finger paths reaching up to each home key. The
 *  fingertip badge on each home key is the interactive handle: click to
 *  toggle enabled (fades the finger), drag onto another key to
 *  reassign its home position. All edits flow through `useHandLayout()`
 *  and persist via the prefs blob. */
export function HandLayoutEditor(props: KeyboardProps) {
  const { layout, toggleEnabled, setFinger, reset } = useHandLayout();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const kbRef = useRef<HTMLDivElement | null>(null);
  const [keyRects, setKeyRects] = useState<Record<string, Rect>>({});
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Measure every key's position relative to the keyboard wrapper so
  // the ghost-hand paths and fingertip badges share one coordinate
  // system that excludes the footer text. ResizeObserver covers
  // viewport / scale changes.
  useLayoutEffect(() => {
    const kb = kbRef.current;
    if (!kb) return;
    const measure = () => {
      const kbRect = kb.getBoundingClientRect();
      const map: Record<string, Rect> = {};
      kb.querySelectorAll<HTMLElement>("[data-key-code]").forEach((el) => {
        const code = el.dataset.keyCode;
        if (!code) return;
        const r = el.getBoundingClientRect();
        map[code] = {
          x: r.left - kbRect.left,
          y: r.top - kbRect.top,
          w: r.width,
          h: r.height,
        };
      });
      setKeyRects(map);
      setSize({ w: kbRect.width, h: kbRect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(kb);
    return () => ro.disconnect();
  }, []);

  // Global pointer listeners so a drag started on a finger button can
  // be followed and dropped anywhere — including on a keyboard key
  // outside the original button's hit-box.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      const dx = e.clientX - cur.start.x;
      const dy = e.clientY - cur.start.y;
      const active = cur.active || Math.hypot(dx, dy) > DRAG_THRESHOLD_PX;
      const next: DragState = {
        ...cur,
        active,
        pointer: { x: e.clientX, y: e.clientY },
      };
      dragRef.current = next;
      setDrag(next);
    };
    const onUp = (e: PointerEvent) => {
      const cur = dragRef.current;
      if (!cur) return;
      dragRef.current = null;
      setDrag(null);
      if (!cur.active) {
        toggleEnabled(cur.finger);
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const keyEl = el?.closest<HTMLElement>("[data-key-code]");
      const code = keyEl?.dataset.keyCode;
      if (code) setFinger(cur.finger, { homeKey: code });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [toggleEnabled, setFinger]);

  const startDrag = (finger: FingerId, pointer: Pointer) => {
    const next: DragState = { finger, pointer, start: pointer, active: false };
    dragRef.current = next;
    setDrag(next);
  };

  // Compute fingertip anchor for each finger from its home key rect.
  // Picks a point near the top of the key so the finger path reads as
  // "reaching up onto" the key rather than "entering through" it.
  const tipOf = (fid: FingerId): Pt | null => {
    const r = keyRects[layout.fingers[fid].homeKey];
    if (!r) return null;
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.4 };
  };

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Keyboard wrapper. Bottom padding leaves room for the wrists.
       *  All hand visuals are anchored inside this wrapper so they
       *  share one coordinate system with the keys themselves. */}
      <div ref={kbRef} className="relative pb-28">
        <Keyboard {...props} />

        {/* Ghost hands — purely decorative, painted in foreground at
         *  low opacity so the keys remain legible. Pointer events
         *  disabled so they don't intercept clicks meant for keys. */}
        {size.w > 0 ? (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 text-foreground"
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
          >
            <GhostHand
              side="left"
              fingers={LEFT_FINGERS}
              tipOf={tipOf}
              enabled={(fid) => layout.fingers[fid].enabled}
              draggingFid={drag?.active ? drag.finger : null}
            />
            <GhostHand
              side="right"
              fingers={RIGHT_FINGERS}
              tipOf={tipOf}
              enabled={(fid) => layout.fingers[fid].enabled}
              draggingFid={drag?.active ? drag.finger : null}
            />
          </svg>
        ) : null}

        {/* Interactive fingertip handles — the click/drag targets. Sit
         *  on top of each home key, paint over the ghost-hand
         *  fingertip. Two thumbs sharing Space are offset left/right
         *  so they don't overlap. */}
        {(Object.keys(layout.fingers) as FingerId[]).map((fid) => {
          const fs = layout.fingers[fid];
          const r = keyRects[fs.homeKey];
          if (!r) return null;
          const isThumb = fid === "L1" || fid === "R1";
          const ox = isThumb ? (fid === "L1" ? -r.w * 0.22 : r.w * 0.22) : 0;
          const isDragging = drag?.active && drag.finger === fid;
          return (
            <button
              key={fid}
              type="button"
              aria-label={`${FINGER_NAME[fid]} — home ${prettyKey(fs.homeKey)}${
                fs.enabled ? "" : " (disabled)"
              }`}
              onPointerDown={(e) => {
                e.preventDefault();
                startDrag(fid, { x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "absolute flex size-5 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full border border-foreground/30 bg-background text-[9px] font-bold text-foreground shadow-sm transition-opacity active:cursor-grabbing",
                !fs.enabled && "opacity-30",
                isDragging && "opacity-40",
              )}
              style={{
                left: r.x + r.w / 2 + ox,
                top: r.y + r.h * 0.5,
              }}
            >
              {prettyKey(fs.homeKey)}
              {!fs.enabled ? (
                <span
                  aria-hidden
                  className="absolute h-px w-4 rotate-45 bg-foreground/70"
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>
          Click a finger to disable it · drag a finger onto a key to
          move its home position.
        </span>
        <button
          type="button"
          onClick={reset}
          className="rounded-md px-2 py-1 text-foreground transition-colors hover:bg-muted"
        >
          Reset
        </button>
      </div>

      {/* Floating drag avatar — portalled to <body> so its `fixed`
       *  positioning is anchored to the viewport, not whatever parent
       *  containing block (popover / modal) has a CSS transform. */}
      {drag?.active && typeof document !== "undefined"
        ? createPortal(
            <span
              aria-hidden
              className="pointer-events-none fixed z-[100] flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-foreground/40 bg-background text-[10px] font-bold text-foreground shadow-lg"
              style={{ left: drag.pointer.x, top: drag.pointer.y }}
            >
              {prettyKey(layout.fingers[drag.finger].homeKey)}
            </span>,
            document.body,
          )
        : null}
    </div>
  );
}

/** One ghost hand, drawn as a unified silhouette: an elliptical palm,
 *  a tapering wrist, and five tapered finger shapes (polygon body +
 *  base / tip circles for rounded ends). Everything paints in
 *  `currentColor` and is wrapped in a single `<g>` whose group opacity
 *  flattens the layered shapes — so the palm, the wrist, the finger
 *  bases and the fingers themselves read as one cohesive limb instead
 *  of a stack of strokes that visibly seam together. */
function GhostHand({
  side,
  fingers,
  tipOf,
  enabled,
  draggingFid,
}: {
  side: "left" | "right";
  fingers: readonly FingerId[];
  tipOf: (fid: FingerId) => Pt | null;
  enabled: (fid: FingerId) => boolean;
  draggingFid: FingerId | null;
}) {
  const tips = fingers
    .map((fid) => ({ fid, tip: tipOf(fid) }))
    .filter((e): e is { fid: FingerId; tip: Pt } => e.tip != null);
  const nonThumb = tips.filter((e) => Number(e.fid[1]) !== 1);
  if (nonThumb.length === 0) return null;

  const xs = nonThumb.map((e) => e.tip.x);
  const ys = nonThumb.map((e) => e.tip.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const tipsCY = Math.max(...ys);

  // Palm geometry. The ellipse sits ~80px below the home row and spans
  // a touch wider than the non-thumb fingertip span, giving the four
  // straight fingers a natural place to attach.
  const palmCX = (minX + maxX) / 2;
  const palmCY = tipsCY + 80;
  const palmRX = (maxX - minX) / 2 + 26;
  const palmRY = 34;

  // Wrist trails below the palm, narrower than the palm and rotated
  // toward the body's midline so the hand reads as anatomically tilted
  // (left hand angles right, right hand angles left).
  const tilt = side === "left" ? 14 : -14;
  const wristCX = palmCX + tilt;
  const wristTopY = palmCY + palmRY * 0.85;
  const wristBotY = palmCY + palmRY + 56;
  const wristTopHalf = palmRX * 0.65;
  const wristBotHalf = palmRX * 0.5;

  const thumbFid = side === "left" ? ("L1" as const) : ("R1" as const);

  // Non-thumb finger bases sit on the top arc of the ellipse, evenly
  // spaced and ordered so each base lands directly below its tip — no
  // crossed fingers.
  const orderedNonThumb = [...nonThumb].sort((a, b) => a.tip.x - b.tip.x);
  const fingerBases = new Map<FingerId, Pt>();
  orderedNonThumb.forEach((e, i) => {
    const t = (i + 0.5) / orderedNonThumb.length;
    const localX = (t - 0.5) * 2 * palmRX * 0.78;
    // Top of the ellipse at this localX: y = -ry * sqrt(1 - x²/rx²)
    const yOff = -palmRY * Math.sqrt(Math.max(0, 1 - (localX / palmRX) ** 2));
    fingerBases.set(e.fid, { x: palmCX + localX, y: palmCY + yOff });
  });

  // Thumb base anchors on the palm's inner-lower flank — that's where
  // the thenar muscle sits anatomically. Left hand's thumb hangs off
  // the right side of the palm; right hand's hangs off the left.
  const thumbBase: Pt = {
    x: palmCX + (side === "left" ? palmRX * 0.55 : -palmRX * 0.55),
    y: palmCY + palmRY * 0.15,
  };

  // Wrist is a path that tapers from palm-ellipse bottom to a slightly
  // narrower wrist-end, with rounded corners at the bottom.
  const wristPath = [
    `M ${wristCX - wristTopHalf} ${wristTopY}`,
    `L ${wristCX - wristBotHalf} ${wristBotY - 10}`,
    `Q ${wristCX - wristBotHalf} ${wristBotY} ${wristCX - wristBotHalf + 10} ${wristBotY}`,
    `L ${wristCX + wristBotHalf - 10} ${wristBotY}`,
    `Q ${wristCX + wristBotHalf} ${wristBotY} ${wristCX + wristBotHalf} ${wristBotY - 10}`,
    `L ${wristCX + wristTopHalf} ${wristTopY}`,
    "Z",
  ].join(" ");

  return (
    <g opacity={0.5}>
      <g fill="currentColor">
        {/* Wrist (drawn first so the palm covers the seam at the top). */}
        <path d={wristPath} />
        {/* Palm */}
        <ellipse cx={palmCX} cy={palmCY} rx={palmRX} ry={palmRY} />
        {/* Each finger: a tapered polygon flanked by rounded base /
         *  tip circles. The base circle overlaps the palm so the join
         *  is invisible; the tip circle gives a rounded fingertip. */}
        {tips.map(({ fid, tip }) => {
          const isThumb = fid === thumbFid;
          const base = isThumb ? thumbBase : fingerBases.get(fid);
          if (!base) return null;
          const w = FINGER_WIDTH[fid];
          const on = enabled(fid);
          const isDragging = draggingFid === fid;
          // Disabled fingers fade further and lose their fill almost
          // entirely so the user reads "this finger is out".
          const fingerOpacity = isDragging ? 0.4 : on ? 1 : 0.28;
          const polygon = taperedPolygon(base, tip, w.base, w.tip);
          return (
            <g key={fid} opacity={fingerOpacity}>
              <circle cx={base.x} cy={base.y} r={w.base / 2} />
              <polygon points={polygon} />
              <circle cx={tip.x} cy={tip.y} r={w.tip / 2} />
            </g>
          );
        })}
      </g>
      {/* Soft outline — picks out the silhouette without competing
       *  with the keyboard's own borders. */}
      <ellipse
        cx={palmCX}
        cy={palmCY}
        rx={palmRX}
        ry={palmRY}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.25}
        strokeWidth={1}
      />
    </g>
  );
}

/** Build the four-vertex polygon for a tapered finger: wider at the
 *  base, narrower at the tip. The vertices sit on the perpendiculars
 *  to the base→tip vector at each end, with the matching base / tip
 *  circles supplying the rounded ends. */
function taperedPolygon(
  base: Pt,
  tip: Pt,
  baseW: number,
  tipW: number,
): string {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // perpendicular x
  const py = dx / len; // perpendicular y
  const points: [number, number][] = [
    [base.x + px * (baseW / 2), base.y + py * (baseW / 2)],
    [tip.x + px * (tipW / 2), tip.y + py * (tipW / 2)],
    [tip.x - px * (tipW / 2), tip.y - py * (tipW / 2)],
    [base.x - px * (baseW / 2), base.y - py * (baseW / 2)],
  ];
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}
