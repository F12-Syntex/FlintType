"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { usePractice } from "./practice-state";

// ─────────────────────────────────────────────────────────────────────
// Sizing, layout & theming. Future: source these from /app/customise.
// ─────────────────────────────────────────────────────────────────────

const KEY_SIZE = 44;
const KEY_GAP = 4;
const ROW_GAP = 4;
const SPACE_WIDTH = 420;

type SpecialName =
  | "tab"
  | "caps"
  | "shift"
  | "backspace"
  | "enter"
  | "ctrl"
  | "opt"
  | "cmd";

const SPECIAL_LABEL: Record<SpecialName, string> = {
  tab: "tab",
  caps: "caps",
  shift: "shift",
  backspace: "⌫",
  enter: "enter",
  ctrl: "ctrl",
  opt: "opt",
  cmd: "⌘",
};

const SPECIAL_W: Record<SpecialName, number> = {
  tab: 60,
  caps: 76,
  shift: 110,
  backspace: 72,
  enter: 92,
  ctrl: 62,
  opt: 54,
  cmd: 68,
};

type Special = { name: SpecialName };

type LayoutRow = {
  keys: string;
  offset: number;
  prefix?: Special;
  suffix?: Special;
};

type KeyboardLayout = {
  id: string;
  rows: LayoutRow[];
  bottomRow: Special[];
};

const QWERTY_US: KeyboardLayout = {
  id: "qwerty-us",
  rows: [
    { keys: "`1234567890-=", offset: 0, suffix: { name: "backspace" } },
    { keys: "qwertyuiop[]\\", offset: 32, prefix: { name: "tab" } },
    {
      keys: "asdfghjkl;'",
      offset: 42,
      prefix: { name: "caps" },
      suffix: { name: "enter" },
    },
    {
      keys: "zxcvbnm,./",
      offset: 58,
      prefix: { name: "shift" },
      suffix: { name: "shift" },
    },
  ],
  bottomRow: [
    { name: "ctrl" },
    { name: "opt" },
    { name: "cmd" },
    { name: "cmd" },
    { name: "opt" },
    { name: "ctrl" },
  ],
};

// ─── finger zones (8-finger touch typing) ──────────────────────────
const FINGER: Record<string, number> = {
  q: 1, a: 1, z: 1, "1": 1,
  w: 2, s: 2, x: 2, "2": 2,
  e: 3, d: 3, c: 3, "3": 3,
  r: 4, f: 4, v: 4, "4": 4, t: 4, g: 4, b: 4, "5": 4,
  y: 5, h: 5, n: 5, "6": 5, u: 5, j: 5, m: 5, "7": 5,
  i: 6, k: 6, ",": 6, "8": 6,
  o: 7, l: 7, ".": 7, "9": 7,
  p: 8, ";": 8, "'": 8, "/": 8, "0": 8, "[": 8, "]": 8, "\\": 8, "-": 8, "=": 8,
};
const FINGER_COLOR = [
  "transparent", "#7A6BA0", "#5B7FA8", "#5A9180", "#9A7A52",
  "#9A7A52", "#5A9180", "#5B7FA8", "#7A6BA0",
];

const HOME_KEY: Record<number, string> = {
  1: "a",
  2: "s",
  3: "d",
  4: "f",
  5: "j",
  6: "k",
  7: "l",
  8: ";",
};
const FINGERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

// ─── one key ───────────────────────────────────────────────────────
type KeyProps = {
  k?: string;
  label: string;
  w?: number;
  variant?: "letter" | "modifier";
  nextKey?: string;
  heat: Record<string, number>;
  recent: readonly string[];
  maxHeat: number;
  registerRef?: (el: HTMLDivElement | null) => void;
};

function Key({
  k,
  label,
  w = KEY_SIZE,
  variant = "letter",
  nextKey,
  heat,
  recent,
  maxHeat,
  registerRef,
}: KeyProps) {
  const v = (k && heat[k]) ?? 0;
  const intensity = maxHeat > 0 ? v / maxHeat : 0;
  const isNext = !!k && k === nextKey;
  const recentIdx = k ? recent.indexOf(k) : -1;
  const recentOpacity = recentIdx >= 0 ? 1 - recentIdx * 0.3 : 0;
  const isHot = intensity > 0.5;
  const isMod = variant === "modifier";

  return (
    <div
      ref={registerRef}
      className={cn(
        "relative flex items-center overflow-hidden rounded-md font-medium tabular-nums",
        isMod ? "justify-start pl-2" : "justify-center",
        isMod
          ? "text-[10px] uppercase tracking-[0.14em] text-ft-dim-2"
          : "text-sm text-ft-ink",
        isNext &&
          "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white",
        !isNext && "border border-ft-line-soft bg-white",
      )}
      style={{
        width: w,
        height: KEY_SIZE,
        background: isNext
          ? undefined
          : isHot
            ? `rgba(229,83,42,${0.08 + intensity * 0.4})`
            : undefined,
        boxShadow: isNext ? "0 0 0 4px rgba(229,83,42,0.18)" : undefined,
      }}
    >
      <span>{label}</span>

      {recentIdx >= 0 ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-md border-[1.5px] border-ft-ember"
          style={{ opacity: recentOpacity * 0.6 }}
          aria-hidden
        />
      ) : null}

      {!isMod && v >= 30 ? (
        <span
          className={cn(
            "absolute top-1 right-1.5 text-[8px] font-semibold tabular-nums",
            isNext ? "text-white" : "text-ft-ember",
          )}
        >
          +{v}
        </span>
      ) : null}

      {k ? (
        <span
          className="absolute right-0 bottom-0 left-0 h-0.5"
          style={{
            background: FINGER_COLOR[FINGER[k] || 0] || "transparent",
            opacity: 0.65,
          }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

// ─── public component ─────────────────────────────────────────────
type KeyCenter = { x: number; y: number };

export function LiveKeyboard() {
  const { state } = usePractice();

  const word = state.words[state.cursorWord];
  let nextKey: string | undefined;
  if (word) {
    if (state.cursorChar < word.length) {
      nextKey = word[state.cursorChar]?.toLowerCase();
    } else {
      nextKey = "space";
    }
  }

  // Empty stubs — fill in when per-key timing tracking lands.
  const heat: Record<string, number> = {};
  const recent: readonly string[] = [];
  const maxHeat = 0;

  const layout = QWERTY_US;

  // ─── geometry: measure key centers via refs ──────────────────────
  const surfaceRef = useRef<HTMLDivElement>(null);
  const keyEls = useRef<Record<string, HTMLDivElement | null>>({});
  const spaceEl = useRef<HTMLDivElement | null>(null);
  const [centers, setCenters] = useState<Record<string, KeyCenter>>({});

  const measure = useCallback(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    const sr = surface.getBoundingClientRect();
    const out: Record<string, KeyCenter> = {};
    for (const [k, el] of Object.entries(keyEls.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      out[k] = {
        x: r.left - sr.left + r.width / 2,
        y: r.top - sr.top + r.height / 2,
      };
    }
    if (spaceEl.current) {
      const r = spaceEl.current.getBoundingClientRect();
      out.space = {
        x: r.left - sr.left + r.width / 2,
        y: r.top - sr.top + r.height / 2,
      };
    }
    setCenters(out);
  }, []);

  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    if (surfaceRef.current) ro.observe(surfaceRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // ─── hand simulation: one finger flies to the pressed key ────────
  const [pressed, setPressed] = useState<{
    finger: number;
    center: KeyCenter;
  } | null>(null);

  useEffect(() => {
    if (state.lastKey == null || state.lastKeyAt == null) return;
    const k = state.lastKey;
    if (k === "space") return; // thumbs handled separately
    const finger = FINGER[k];
    if (!finger) return;
    const center = centers[k];
    if (!center) return;
    setPressed({ finger, center });
    const t = setTimeout(() => setPressed(null), 180);
    return () => clearTimeout(t);
  }, [state.lastKeyAt, state.lastKey, centers]);

  const [thumbPressed, setThumbPressed] = useState<boolean>(false);
  useEffect(() => {
    if (state.lastKey !== "space" || state.lastKeyAt == null) return;
    setThumbPressed(true);
    const t = setTimeout(() => setThumbPressed(false), 180);
    return () => clearTimeout(t);
  }, [state.lastKeyAt, state.lastKey]);

  return (
    <div
      ref={surfaceRef}
      className="relative flex w-full justify-center overflow-x-auto pt-7"
    >
      {/* ─── hand simulation overlay ──────────────────────────────────── */}
      <svg
        className="pointer-events-none absolute inset-0 z-10 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <filter id="hand-shadow">
            <feComponentTransfer in="SourceAlpha">
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feOffset dx="0" dy="8" result="offsetBlur" />
            <feFlood floodColor="#000000" floodOpacity="0.15" result="shadowColor" />
            <feComposite in="shadowColor" in2="offsetBlur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {centers["a"] && centers[";"] && centers.space && (
          <>
            {[false, true].map((isRight) => {
              const fingers = isRight ? [5, 6, 7, 8] : [1, 2, 3, 4];
              
              const palmY = centers["k"].y + 60; // Base of fingers

              const wristInner = isRight ? [centers["j"].x - 10, palmY + 60] : [centers["f"].x + 10, palmY + 60];
              const wristOuter = isRight ? [centers[";"].x + 16, palmY + 60] : [centers["a"].x - 16, palmY + 60];

              const armInner = [wristInner[0] + (isRight ? -10 : 10), wristInner[1] + 250];
              const armOuter = [wristOuter[0] + (isRight ? 10 : -10), wristOuter[1] + 250];

              const thumbBase = isRight ? [centers["j"].x - 25, palmY + 20] : [centers["f"].x + 25, palmY + 20];
              const thumbKnuckle = isRight ? [centers["j"].x - 45, palmY + 45] : [centers["f"].x + 45, palmY + 45];
              const thumbTip = [centers.space.x + (isRight ? 30 : -30), thumbPressed ? centers.space.y - 6 : centers.space.y - 20];

              const pinkyK = isRight ? [centers[";"].x + 6, palmY + 8] : [centers["a"].x - 6, palmY + 8];
              const ringK = isRight ? [centers["l"].x + 2, palmY - 2] : [centers["s"].x - 2, palmY - 2];
              const middleK = isRight ? [centers["k"].x, palmY - 6] : [centers["d"].x, palmY - 6];
              const indexK = isRight ? [centers["j"].x - 2, palmY] : [centers["f"].x + 2, palmY];

              const palmPath = `
                M ${armOuter[0]},${armOuter[1]} 
                L ${wristOuter[0]},${wristOuter[1]} 
                L ${pinkyK[0]},${pinkyK[1]} 
                L ${ringK[0]},${ringK[1]} 
                L ${middleK[0]},${middleK[1]} 
                L ${indexK[0]},${indexK[1]} 
                L ${thumbBase[0]},${thumbBase[1]} 
                L ${wristInner[0]},${wristInner[1]} 
                L ${armInner[0]},${armInner[1]} 
                Z
              `;

              const knuckles: Record<number, number[]> = isRight
                ? { 5: indexK, 6: middleK, 7: ringK, 8: pinkyK }
                : { 1: pinkyK, 2: ringK, 3: middleK, 4: indexK };

              const SKIN_FILL = "#E6B999";     
              const NAIL_FILL = "#F2D5C4";     

              return (
                <g key={isRight ? "right" : "left"} filter="url(#hand-shadow)">
                  {/* Palm & Arm */}
                  <path 
                    d={palmPath} 
                    fill={SKIN_FILL} 
                    stroke={SKIN_FILL} 
                    strokeWidth="12" 
                    strokeLinejoin="round" 
                  />

                  {/* Thumb */}
                  <g>
                    <path 
                      d={`M ${thumbBase[0]},${thumbBase[1]} L ${thumbKnuckle[0]},${thumbKnuckle[1]} L ${thumbTip[0]},${thumbTip[1]}`}
                      stroke={SKIN_FILL}
                      strokeWidth="18"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      className="transition-all duration-150 ease-out"
                    />
                    {(() => {
                      const tdx = thumbTip[0] - thumbKnuckle[0];
                      const tdy = thumbTip[1] - thumbKnuckle[1];
                      const tAngle = Math.atan2(tdy, tdx) * (180 / Math.PI);
                      const tDist = Math.sqrt(tdx*tdx + tdy*tdy) || 1;
                      const tnx = thumbTip[0] + (tdx/tDist) * 2;
                      const tny = thumbTip[1] + (tdy/tDist) * 2;
                      return (
                        <ellipse 
                          cx={tnx} cy={tny} 
                          rx="4.5" ry="5.5" 
                          fill={NAIL_FILL} 
                          transform={`rotate(${tAngle + 90} ${tnx} ${tny})`} 
                          className="transition-all duration-150 ease-out"
                        />
                      );
                    })()}
                  </g>

                  {/* Fingers */}
                  {fingers.map((f) => {
                    const isPressed = pressed?.finger === f;
                    const homeCenter = centers[HOME_KEY[f]!];
                    if (!homeCenter) return null;

                    const target = isPressed ? pressed.center : homeCenter;
                    const HOVER_OFFSET = 26;
                    const PRESS_OFFSET = 6;
                    
                    const tipX = target.x;
                    const tipY = isPressed ? target.y - PRESS_OFFSET : homeCenter.y - HOVER_OFFSET;
                    
                    const knuckle = knuckles[f]!;
                    
                    const dx = tipX - knuckle[0];
                    const dy = tipY - knuckle[1];
                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    const nx = tipX + (dx/dist) * 2;
                    const ny = tipY + (dy/dist) * 2;

                    return (
                      <g key={f}>
                        <line 
                          x1={knuckle[0]} y1={knuckle[1]} 
                          x2={tipX} y2={tipY} 
                          stroke={SKIN_FILL} 
                          strokeWidth="16" 
                          strokeLinecap="round" 
                          className="transition-all duration-150 ease-out"
                        />
                        <ellipse 
                          cx={nx} cy={ny} 
                          rx="4" ry="5" 
                          fill={NAIL_FILL} 
                          transform={`rotate(${angle + 90} ${nx} ${ny})`} 
                          className="transition-all duration-150 ease-out"
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </>
        )}
      </svg>

      {/* ─── keyboard grid ──────────────────────────────────────────── */}
      <div className="flex flex-col items-center" style={{ gap: ROW_GAP }}>
        {layout.rows.map((row, ri) => (
          <div
            key={ri}
            className="flex"
            style={{ gap: KEY_GAP, marginLeft: row.offset }}
          >
            {row.prefix ? (
              <Key
                label={SPECIAL_LABEL[row.prefix.name]}
                w={SPECIAL_W[row.prefix.name]}
                variant="modifier"
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ) : null}
            {row.keys.split("").map((k, i) => (
              <Key
                key={k + i}
                k={k}
                label={k}
                nextKey={nextKey}
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
                registerRef={(el) => {
                  keyEls.current[k] = el;
                }}
              />
            ))}
            {row.suffix ? (
              <Key
                label={SPECIAL_LABEL[row.suffix.name]}
                w={SPECIAL_W[row.suffix.name]}
                variant="modifier"
                heat={heat}
                recent={recent}
                maxHeat={maxHeat}
              />
            ) : null}
          </div>
        ))}

        {/* Bottom row */}
        <div className="flex" style={{ gap: KEY_GAP }}>
          {layout.bottomRow.slice(0, layout.bottomRow.length / 2).map((m, i) => (
            <Key
              key={`bL-${i}`}
              label={SPECIAL_LABEL[m.name]}
              w={SPECIAL_W[m.name]}
              variant="modifier"
              heat={heat}
              recent={recent}
              maxHeat={maxHeat}
            />
          ))}
          <div
            ref={spaceEl}
            className={cn(
              "flex items-center justify-center rounded-md text-[10px] tracking-[0.18em] transition-colors",
              nextKey === "space"
                ? "border-[1.5px] border-ft-ember bg-ft-ember font-bold text-white"
                : "border border-ft-line-soft bg-white text-ft-dim",
            )}
            style={{
              width: SPACE_WIDTH,
              height: KEY_SIZE,
              boxShadow:
                nextKey === "space" ? "0 0 0 4px rgba(229,83,42,0.18)" : undefined,
            }}
          >
            SPACE
          </div>
          {layout.bottomRow.slice(layout.bottomRow.length / 2).map((m, i) => (
            <Key
              key={`bR-${i}`}
              label={SPECIAL_LABEL[m.name]}
              w={SPECIAL_W[m.name]}
              variant="modifier"
              heat={heat}
              recent={recent}
              maxHeat={maxHeat}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
