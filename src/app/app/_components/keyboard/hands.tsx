"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  type FingerId,
  type FingerState,
  FINGER_NAME,
  LEFT_FINGERS,
  RIGHT_FINGERS,
  useHandLayout,
} from "@/lib/hand-layout";
import { cn } from "@/lib/utils";
import { Keyboard, type KeyboardProps } from "./index";

/** Pixel rect of a key, relative to the container. */
type Rect = { x: number; y: number; w: number; h: number };

/** Stable per-finger colour. Mirror-symmetric across hands so the
 *  pinkies / ring / middle / index pairs read as "the same finger" on
 *  either side. Picked from Tailwind's palette so the hues land cleanly
 *  on both light and dark themes. */
const FINGER_COLOR: Record<FingerId, string> = {
  L5: "#f97316",
  L4: "#eab308",
  L3: "#22c55e",
  L2: "#06b6d4",
  L1: "#a78bfa",
  R1: "#a78bfa",
  R2: "#06b6d4",
  R3: "#22c55e",
  R4: "#eab308",
  R5: "#f97316",
};

/** Anatomical index 1..5 → pixel height ratio (% of hand row). Roughly
 *  matches finger lengths so the schematic reads as a hand at a glance. */
const FINGER_HEIGHT_PCT: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 50, // thumb
  2: 90, // index
  3: 100, // middle
  4: 92, // ring
  5: 70, // pinky
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

type Pointer = { x: number; y: number };

type DragState = {
  finger: FingerId;
  pointer: Pointer;
  /** True once the pointer moved past the drag threshold — disambiguates
   *  click (toggle enabled) from drag (reassign home key). */
  active: boolean;
  start: Pointer;
};

/** Wraps `<Keyboard />` with an interactive hand-layout editor. Two
 *  schematic hands sit above the keyboard; each finger is clickable
 *  (toggle enabled) and draggable (drop on a key to reassign its home
 *  position). A coloured dot on the home key visualises the assignment.
 *  All edits flow through `useHandLayout()` and persist via the prefs
 *  blob. */
export function HandLayoutEditor(props: KeyboardProps) {
  const { layout, toggleEnabled, setFinger, reset } = useHandLayout();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const kbRef = useRef<HTMLDivElement | null>(null);
  const [keyRects, setKeyRects] = useState<Record<string, Rect>>({});
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  // Measure every key's position relative to the container so the
  // finger-dot overlay can be absolutely placed without DOM thrash.
  // ResizeObserver covers viewport / scale changes.
  useLayoutEffect(() => {
    const container = containerRef.current;
    const kb = kbRef.current;
    if (!container || !kb) return;
    const measure = () => {
      const cRect = container.getBoundingClientRect();
      const map: Record<string, Rect> = {};
      kb.querySelectorAll<HTMLElement>("[data-key-code]").forEach((el) => {
        const code = el.dataset.keyCode;
        if (!code) return;
        const r = el.getBoundingClientRect();
        map[code] = {
          x: r.left - cRect.left,
          y: r.top - cRect.top,
          w: r.width,
          h: r.height,
        };
      });
      setKeyRects(map);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(container);
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
        // Treat as a click — toggle enabled.
        toggleEnabled(cur.finger);
        return;
      }
      // Drop: find a key under the pointer and reassign home.
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

  return (
    <div ref={containerRef} className="relative select-none">
      <div className="mb-3 flex items-end justify-between gap-6 px-2">
        <HandSchematic
          side="left"
          fingers={LEFT_FINGERS}
          state={layout.fingers}
          activeDrag={drag?.finger ?? null}
          onPointerDownFinger={startDrag}
        />
        <HandSchematic
          side="right"
          fingers={RIGHT_FINGERS}
          state={layout.fingers}
          activeDrag={drag?.finger ?? null}
          onPointerDownFinger={startDrag}
        />
      </div>

      <div ref={kbRef} className="relative">
        <Keyboard {...props} />
        {/* Coloured dots on each home key. Two thumbs sharing Space
         *  are offset left/right so they don't overlap. */}
        {(Object.keys(layout.fingers) as FingerId[]).map((fid) => {
          const fs = layout.fingers[fid];
          const r = keyRects[fs.homeKey];
          if (!r) return null;
          const isThumb = fid === "L1" || fid === "R1";
          const ox = isThumb ? (fid === "L1" ? -r.w * 0.18 : r.w * 0.18) : 0;
          return (
            <span
              key={fid}
              className={cn(
                "pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background",
                !fs.enabled && "opacity-25",
              )}
              style={{
                left: r.x + r.w / 2 + ox,
                top: r.y + r.h * 0.82,
                backgroundColor: FINGER_COLOR[fid],
              }}
              aria-hidden
            />
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

      {/* Floating drag avatar — only after the threshold is crossed. */}
      {drag?.active ? (
        <span
          aria-hidden
          className="pointer-events-none fixed z-50 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-lg"
          style={{
            left: drag.pointer.x,
            top: drag.pointer.y,
            backgroundColor: FINGER_COLOR[drag.finger],
          }}
        >
          {prettyKey(layout.fingers[drag.finger].homeKey)}
        </span>
      ) : null}
    </div>
  );
}

function HandSchematic({
  side,
  fingers,
  state,
  activeDrag,
  onPointerDownFinger,
}: {
  side: "left" | "right";
  fingers: readonly FingerId[];
  state: Record<FingerId, FingerState>;
  /** Finger currently being dragged — fades the source button so the
   *  user sees the avatar as the moving thing. */
  activeDrag: FingerId | null;
  onPointerDownFinger: (id: FingerId, pointer: Pointer) => void;
}) {
  return (
    <div className="flex w-1/2 max-w-[14rem] flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {side === "left" ? "left hand" : "right hand"}
      </span>
      <div className="flex h-28 items-end gap-1.5">
        {fingers.map((fid) => {
          const f = state[fid];
          const idx = Number(fid[1]) as 1 | 2 | 3 | 4 | 5;
          const colour = FINGER_COLOR[fid];
          const isDragging = activeDrag === fid;
          return (
            <button
              key={fid}
              type="button"
              aria-label={`${FINGER_NAME[fid]} — home ${prettyKey(f.homeKey)}${
                f.enabled ? "" : " (disabled)"
              }`}
              onPointerDown={(e) => {
                e.preventDefault();
                onPointerDownFinger(fid, { x: e.clientX, y: e.clientY });
              }}
              className={cn(
                "relative flex flex-1 cursor-grab flex-col items-center justify-end rounded-t-md border-2 bg-card font-mono text-[11px] text-foreground transition-opacity active:cursor-grabbing",
                !f.enabled && "opacity-30",
                isDragging && "opacity-50",
              )}
              style={{
                height: `${FINGER_HEIGHT_PCT[idx]}%`,
                borderColor: colour,
              }}
            >
              <span className="pb-1 tabular-nums">{prettyKey(f.homeKey)}</span>
              {!f.enabled ? (
                <span
                  aria-hidden
                  className="absolute h-px w-5 rotate-45 bg-foreground/60"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {/* Tiny "palm" base so the finger pills sit on something. */}
      <div className="h-1.5 rounded-md bg-border" />
    </div>
  );
}
