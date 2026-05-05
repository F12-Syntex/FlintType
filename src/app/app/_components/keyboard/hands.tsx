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

/** Stroke thickness per finger — thicker for the larger fingers, thumb
 *  is the chunkiest. Tuned by eye against the keyboard scale. */
const FINGER_STROKE: Record<FingerId, number> = {
  L5: 14,
  L4: 17,
  L3: 18,
  L2: 18,
  L1: 22,
  R1: 22,
  R2: 18,
  R3: 18,
  R4: 17,
  R5: 14,
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
      <div ref={kbRef} className="relative pb-16">
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
              kbHeight={size.h}
            />
            <GhostHand
              side="right"
              fingers={RIGHT_FINGERS}
              tipOf={tipOf}
              enabled={(fid) => layout.fingers[fid].enabled}
              draggingFid={drag?.active ? drag.finger : null}
              kbHeight={size.h}
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

/** One ghost hand, drawn as filled palm + wrist + 5 stroked finger
 *  paths. All shapes paint in `currentColor` at low alpha so the result
 *  reads as a soft silhouette under the keys, never obscuring them.
 *  Geometry derives from fingertip positions: the palm sits below the
 *  median fingertip, the wrist trails further down, fingers curve from
 *  the palm edge up to each tip. */
function GhostHand({
  side,
  fingers,
  tipOf,
  enabled,
  draggingFid,
  kbHeight,
}: {
  side: "left" | "right";
  fingers: readonly FingerId[];
  tipOf: (fid: FingerId) => Pt | null;
  enabled: (fid: FingerId) => boolean;
  draggingFid: FingerId | null;
  kbHeight: number;
}) {
  // Resolve tip positions, skipping any that haven't measured yet.
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
  const palmW = maxX - minX + 56;
  const palmH = 56;
  const palmCX = (minX + maxX) / 2;
  const palmCY = tipsCY + 60;
  // Tilt: pull the palm/wrist toward the body's centre line so the
  // hand looks anatomically correct (left hand angles right, right
  // hand angles left).
  const tilt = side === "left" ? 12 : -12;
  const wristCX = palmCX + tilt;
  const wristY = Math.max(palmCY + palmH * 0.7 + 18, kbHeight - 4);

  const thumbFid = side === "left" ? ("L1" as const) : ("R1" as const);
  const thumbTip = tips.find((e) => e.fid === thumbFid)?.tip;

  // Distribute non-thumb finger bases along the top edge of the palm,
  // ordered so left's pinky→index spans left→right and right's index→
  // pinky spans left→right. This keeps each finger's base directly
  // below its tip, so the curves don't cross.
  const orderedNonThumb = [...nonThumb].sort((a, b) => a.tip.x - b.tip.x);
  const baseTopY = palmCY - palmH * 0.45;
  const baseSpan = palmW * 0.78;
  const baseStart = palmCX - baseSpan / 2 + tilt * 0.6;
  const fingerBases = new Map<FingerId, Pt>();
  orderedNonThumb.forEach((e, i) => {
    const t = (i + 0.5) / orderedNonThumb.length;
    fingerBases.set(e.fid, { x: baseStart + t * baseSpan, y: baseTopY });
  });

  // Thumb base sits on the palm's inner side, lower than the four
  // fingers — left hand's thumb anchors right, right hand's anchors
  // left. The control point swings outward so the thumb path curves
  // through the natural arc to Space.
  const thumbBase: Pt = {
    x: palmCX + (side === "left" ? palmW * 0.32 : -palmW * 0.32) + tilt * 0.4,
    y: palmCY + palmH * 0.05,
  };

  // Palm shape: rounded trapezoid spanning finger bases at the top and
  // the wrist at the bottom. Built from a single path with arcs at the
  // corners so the palm and wrist read as one continuous limb.
  const palmLeft = palmCX - palmW / 2 + tilt * 0.6;
  const palmRight = palmCX + palmW / 2 + tilt * 0.6;
  const palmTopL = { x: palmLeft, y: baseTopY };
  const palmTopR = { x: palmRight, y: baseTopY };
  const palmBotL = { x: wristCX - 26, y: wristY };
  const palmBotR = { x: wristCX + 26, y: wristY };
  const r = 18;
  const palmPath = [
    `M ${palmTopL.x + r} ${palmTopL.y}`,
    `L ${palmTopR.x - r} ${palmTopR.y}`,
    `Q ${palmTopR.x} ${palmTopR.y} ${palmTopR.x + 2} ${palmTopR.y + r}`,
    `L ${palmBotR.x + 4} ${palmBotR.y - r}`,
    `Q ${palmBotR.x + 4} ${palmBotR.y} ${palmBotR.x} ${palmBotR.y}`,
    `L ${palmBotL.x} ${palmBotL.y}`,
    `Q ${palmBotL.x - 4} ${palmBotL.y} ${palmBotL.x - 4} ${palmBotL.y - r}`,
    `L ${palmTopL.x - 2} ${palmTopL.y + r}`,
    `Q ${palmTopL.x} ${palmTopL.y} ${palmTopL.x + r} ${palmTopL.y}`,
    "Z",
  ].join(" ");

  return (
    <g>
      {/* Palm + wrist silhouette */}
      <path d={palmPath} fill="currentColor" fillOpacity={0.22} />
      <path
        d={palmPath}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={1.25}
      />
      {/* Fingers */}
      {tips.map(({ fid, tip }) => {
        const isThumb = fid === thumbFid;
        const base = isThumb ? thumbBase : fingerBases.get(fid);
        if (!base) return null;
        const on = enabled(fid);
        const dimming = draggingFid === fid ? 0.4 : 1;
        const opacity = (on ? 0.55 : 0.18) * dimming;
        // Quadratic control: bend slightly outward for thumbs (long
        // arcing motion across the palm) and just-barely-inward for the
        // straight fingers so they read as natural curves rather than
        // ruler lines.
        const ctrl: Pt = isThumb
          ? {
              x: (base.x + tip.x) / 2 + (side === "left" ? 14 : -14),
              y: (base.y + tip.y) / 2 + 6,
            }
          : {
              x: (base.x + tip.x) / 2,
              y: Math.min(base.y, tip.y) - 4,
            };
        return (
          <g key={fid}>
            <path
              d={`M ${base.x} ${base.y} Q ${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y}`}
              stroke="currentColor"
              strokeOpacity={opacity}
              strokeWidth={FINGER_STROKE[fid]}
              strokeLinecap="round"
              fill="none"
            />
            {/* Subtle highlight stroke down the centre — sells the
             *  rounded-finger look without going full 3D. */}
            <path
              d={`M ${base.x} ${base.y} Q ${ctrl.x} ${ctrl.y} ${tip.x} ${tip.y}`}
              stroke="currentColor"
              strokeOpacity={(on ? 0.22 : 0.08) * dimming}
              strokeWidth={Math.max(2, FINGER_STROKE[fid] * 0.35)}
              strokeLinecap="round"
              fill="none"
            />
          </g>
        );
      })}
    </g>
  );
}
