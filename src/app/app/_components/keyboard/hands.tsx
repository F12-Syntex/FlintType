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
            <defs>
              {/* Anime-style line art via filter: take the union alpha
               *  of every shape under it, dilate, subtract original to
               *  get a solid outline ring around the silhouette, then
               *  re-emit a soft body fill underneath. Internal seams
               *  (palm ↔ finger overlaps) vanish because the filter
               *  only outlines the OUTER perimeter of the union. */}
              <filter
                id="ft-hand-style"
                x="-5%"
                y="-5%"
                width="110%"
                height="110%"
              >
                <feMorphology
                  in="SourceAlpha"
                  operator="dilate"
                  radius="1.4"
                  result="dilated"
                />
                <feComposite
                  in="dilated"
                  in2="SourceAlpha"
                  operator="out"
                  result="outlineMask"
                />
                <feFlood
                  floodColor="currentColor"
                  floodOpacity="0.7"
                  result="strokeColor"
                />
                <feComposite
                  in="strokeColor"
                  in2="outlineMask"
                  operator="in"
                  result="outline"
                />
                <feFlood
                  floodColor="currentColor"
                  floodOpacity="0.18"
                  result="bodyColor"
                />
                <feComposite
                  in="bodyColor"
                  in2="SourceAlpha"
                  operator="in"
                  result="body"
                />
                <feMerge>
                  <feMergeNode in="body" />
                  <feMergeNode in="outline" />
                </feMerge>
              </filter>
            </defs>
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

/** One ghost hand, drawn as a unified silhouette in anime-line-art
 *  style. Palm + wrist + enabled fingers all live under a single
 *  `<g filter="url(#ft-hand-style)">` so the SVG filter strokes the
 *  outer perimeter of their union — internal seams (where a finger
 *  overlaps the palm) disappear automatically. Each finger is built
 *  from cubic Bézier curves that bulge subtly outward at the knuckle
 *  and meet a rounded fingertip arc, giving the silhouette an inked,
 *  hand-drawn feel rather than a pile of polygons. */
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

  // Palm geometry. Ellipse sits well below the home row, spanning a
  // little wider than the non-thumb fingertip span so the fingers can
  // attach naturally onto its top arc.
  const palmCX = (minX + maxX) / 2;
  const palmCY = tipsCY + 84;
  const palmRX = (maxX - minX) / 2 + 28;
  const palmRY = 38;

  // Wrist trails below the palm, narrower than the palm and tilted
  // toward the body's midline so the hand reads as anatomically
  // angled (left hand angles right, right hand angles left).
  const tilt = side === "left" ? 14 : -14;
  const wristCX = palmCX + tilt;
  const wristTopY = palmCY + palmRY * 0.7;
  const wristBotY = palmCY + palmRY + 58;
  const wristTopHalf = palmRX * 0.7;
  const wristBotHalf = palmRX * 0.52;

  const thumbFid = side === "left" ? ("L1" as const) : ("R1" as const);

  // Non-thumb finger bases — pulled slightly INSIDE the palm's top
  // arc so the finger silhouette overlaps the palm. Without this
  // overlap, the filter would render an outline at the join; with
  // it, the union reads as one continuous limb.
  const orderedNonThumb = [...nonThumb].sort((a, b) => a.tip.x - b.tip.x);
  const fingerBases = new Map<FingerId, Pt>();
  orderedNonThumb.forEach((e, i) => {
    const t = (i + 0.5) / orderedNonThumb.length;
    const localX = (t - 0.5) * 2 * palmRX * 0.78;
    const yOff = -palmRY * Math.sqrt(Math.max(0, 1 - (localX / palmRX) ** 2));
    fingerBases.set(e.fid, {
      x: palmCX + localX,
      y: palmCY + yOff * 0.9, // 0.9 pulls the base ~10% inside the arc
    });
  });

  // Thumb base sits on the palm's inner-lower flank — anatomically
  // the thenar bulge. Left hand's thumb hangs off the right side of
  // the palm; right hand's off the left.
  const thumbBase: Pt = {
    x: palmCX + (side === "left" ? palmRX * 0.5 : -palmRX * 0.5),
    y: palmCY + palmRY * 0.05,
  };

  // Wrist path — tapered rounded rectangle from the palm bottom down
  // to a narrower wrist-end. Fully filled, no inner detail; the
  // filter strokes the outer perimeter for us.
  const wristPath = [
    `M ${wristCX - wristTopHalf} ${wristTopY}`,
    `L ${wristCX - wristBotHalf} ${wristBotY - 10}`,
    `Q ${wristCX - wristBotHalf} ${wristBotY} ${wristCX - wristBotHalf + 10} ${wristBotY}`,
    `L ${wristCX + wristBotHalf - 10} ${wristBotY}`,
    `Q ${wristCX + wristBotHalf} ${wristBotY} ${wristCX + wristBotHalf} ${wristBotY - 10}`,
    `L ${wristCX + wristTopHalf} ${wristTopY}`,
    "Z",
  ].join(" ");

  // Compute every finger's curved-path geometry up front; we render
  // enabled vs disabled fingers in two separate passes (only enabled
  // fingers participate in the unified outline).
  const fingerEntries = tips
    .map(({ fid, tip }) => {
      const isThumb = fid === thumbFid;
      const base = isThumb ? thumbBase : fingerBases.get(fid);
      if (!base) return null;
      const w = FINGER_WIDTH[fid];
      return {
        fid,
        on: enabled(fid),
        dragging: draggingFid === fid,
        path: fingerPath(base, tip, w.base, w.tip),
      };
    })
    .filter((e): e is NonNullable<typeof e> => e != null);

  return (
    <>
      {/* Active hand — palm + wrist + enabled fingers all under the
       *  unified-outline filter. */}
      <g filter="url(#ft-hand-style)" fill="currentColor">
        <path d={wristPath} />
        <ellipse cx={palmCX} cy={palmCY} rx={palmRX} ry={palmRY} />
        {fingerEntries
          .filter((e) => e.on && !e.dragging)
          .map((e) => (
            <path key={e.fid} d={e.path} />
          ))}
      </g>
      {/* Disabled / dragging fingers — rendered separately, faintly,
       *  so they don't pollute the unified silhouette. The disabled
       *  state is also conveyed by the cross-out badge on the home
       *  key, so this rendering is just a soft hint. */}
      <g fill="currentColor" fillOpacity={0.1}>
        {fingerEntries
          .filter((e) => !e.on || e.dragging)
          .map((e) => (
            <path key={e.fid} d={e.path} />
          ))}
      </g>
    </>
  );
}

/** Cubic-Bézier finger silhouette: wider at the base, narrower at the
 *  tip, with a slight outward bulge on each side near the proximal
 *  knuckle (~⅓ up) and a rounded fingertip arc. The result reads as
 *  an inked anime-style finger rather than a tapered polygon stick. */
function fingerPath(
  base: Pt,
  tip: Pt,
  baseW: number,
  tipW: number,
): string {
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // Perpendicular vectors (left/right of the finger axis).
  const lx = uy;
  const ly = -ux;
  const rx = -uy;
  const ry = ux;

  const baseL: Pt = { x: base.x + lx * (baseW / 2), y: base.y + ly * (baseW / 2) };
  const baseR: Pt = { x: base.x + rx * (baseW / 2), y: base.y + ry * (baseW / 2) };
  const tipL: Pt = { x: tip.x + lx * (tipW / 2), y: tip.y + ly * (tipW / 2) };
  const tipR: Pt = { x: tip.x + rx * (tipW / 2), y: tip.y + ry * (tipW / 2) };

  // Side bulges — the slight outward swell near the knuckle is what
  // separates a hand-drawn finger from a CAD-extruded one.
  const bulge = baseW * 0.06;

  // Up the left side: cubic with control points pulled slightly
  // outward at ⅓ and inward-toward-tip at ⅔.
  const cL1: Pt = {
    x: baseL.x + ux * len * 0.33 + lx * bulge,
    y: baseL.y + uy * len * 0.33 + ly * bulge,
  };
  const cL2: Pt = {
    x: tipL.x - ux * len * 0.33 + lx * (bulge * 0.3),
    y: tipL.y - uy * len * 0.33 + ly * (bulge * 0.3),
  };
  // Tip arc: control points pushed past the tip in the finger
  // direction so the apex rounds smoothly.
  const arcExt = tipW * 0.65;
  const cArc1: Pt = { x: tipL.x + ux * arcExt, y: tipL.y + uy * arcExt };
  const cArc2: Pt = { x: tipR.x + ux * arcExt, y: tipR.y + uy * arcExt };
  // Down the right side, mirror of the left.
  const cR1: Pt = {
    x: tipR.x - ux * len * 0.33 + rx * (bulge * 0.3),
    y: tipR.y - uy * len * 0.33 + ry * (bulge * 0.3),
  };
  const cR2: Pt = {
    x: baseR.x + ux * len * 0.33 + rx * bulge,
    y: baseR.y + uy * len * 0.33 + ry * bulge,
  };

  const f = (n: number) => n.toFixed(1);
  return [
    `M ${f(baseL.x)} ${f(baseL.y)}`,
    `C ${f(cL1.x)} ${f(cL1.y)} ${f(cL2.x)} ${f(cL2.y)} ${f(tipL.x)} ${f(tipL.y)}`,
    `C ${f(cArc1.x)} ${f(cArc1.y)} ${f(cArc2.x)} ${f(cArc2.y)} ${f(tipR.x)} ${f(tipR.y)}`,
    `C ${f(cR1.x)} ${f(cR1.y)} ${f(cR2.x)} ${f(cR2.y)} ${f(baseR.x)} ${f(baseR.y)}`,
    "Z",
  ].join(" ");
}
