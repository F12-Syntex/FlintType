"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type CaretSettings,
  type CaretStyle,
  useCaretSettings,
} from "@/lib/caret-settings";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

const STYLES: ReadonlyArray<{ id: CaretStyle; label: string }> = [
  { id: "line", label: "Line" },
  { id: "block", label: "Block" },
  { id: "underline", label: "Under" },
  { id: "outline", label: "Outline" },
  { id: "off", label: "Off" },
];

const THICKNESS_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "1px", value: 1 },
  { label: "2px", value: 2 },
  { label: "3px", value: 3 },
  { label: "4px", value: 4 },
];

const RADIUS_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Sharp", value: 0 },
  { label: "Soft", value: 2 },
  { label: "Round", value: 6 },
];

const BLINK_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Off", value: 0 },
  { label: "Slow", value: 1500 },
  { label: "Normal", value: 1000 },
  { label: "Fast", value: 500 },
];

const SMOOTH_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Off", value: 0 },
  { label: "Snappy", value: 60 },
  { label: "Normal", value: 110 },
  { label: "Easy", value: 200 },
];

// ─── Caret rendering primitive ──────────────────────────────────────

function CaretShape({
  style,
  width,
  radius,
  blinkSpeed,
  charW,
  charH,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  blinkSpeed: number;
  charW: number;
  charH: number;
}) {
  if (style === "off") return null;

  // Class-based blink (.ft-caret-blink) so React re-renders don't reset
  // the animation. Duration flows in via the --ft-blink-speed CSS var,
  // which can change without restarting the animation either.
  const blinkClass = blinkSpeed > 0 ? "ft-caret-blink" : "";
  const blinkVar = {
    ["--ft-blink-speed" as string]: `${blinkSpeed}ms`,
  } as React.CSSProperties;
  const common: React.CSSProperties = {
    position: "absolute",
    borderRadius: radius,
    backgroundColor: "var(--primary)",
    ...blinkVar,
  };

  if (style === "line") {
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...common,
          width,
          height: charH * 0.85,
          left: 0,
          top: (charH - charH * 0.85) / 2,
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...common,
          width: charW,
          height: charH,
          left: 0,
          top: 0,
          backgroundColor:
            "color-mix(in oklch, var(--primary) 35%, transparent)",
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        className={blinkClass}
        style={{
          ...common,
          width: charW,
          height: width,
          left: 0,
          top: charH - width,
        }}
      />
    );
  }
  // outline
  return (
    <span
      aria-hidden
      className={blinkClass}
      style={{
        ...common,
        width: charW,
        height: charH,
        left: 0,
        top: 0,
        backgroundColor: "transparent",
        border: `${width}px solid var(--primary)`,
      }}
    />
  );
}

// ─── Per-chip mini previews ────────────────────────────────────────
// Static (no blink) so the rows are scannable; the hero preview above
// is the place for live behaviour.

function StyleChipPreview({
  style,
  width,
  radius,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
}) {
  const charW = 16;
  const charH = 20;
  return (
    <span className="relative block" style={{ width: charW, height: charH }}>
      {style !== "off" ? (
        <span
          aria-hidden
          className="absolute inset-0 rounded-sm bg-foreground/15"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[8px] text-muted-foreground">
          —
        </span>
      )}
      <CaretShape
        style={style}
        width={width}
        radius={radius}
        blinkSpeed={0}
        charW={charW}
        charH={charH}
      />
    </span>
  );
}

function ThicknessChipPreview({ width }: { width: number }) {
  // A vertical bar at the chosen thickness, using the chip's text
  // color so it inverts to primary when the chip is active.
  return (
    <span
      aria-hidden
      className="block bg-current"
      style={{ width, height: 18 }}
    />
  );
}

function RoundnessChipPreview({ radius }: { radius: number }) {
  // A short bar with the chosen corner radius — same vertical shape as
  // the line caret so the relationship between this row and Style
  // reads at a glance.
  return (
    <span
      aria-hidden
      className="block bg-current"
      style={{ width: 5, height: 18, borderRadius: radius }}
    />
  );
}

// ─── Hero preview card ─────────────────────────────────────────────

const PREVIEW_WORDS = ["the", "quick", "brown", "fox", "jumps"];

function HeroPreview({ settings }: { settings: CaretSettings }) {
  const flat = PREVIEW_WORDS.join(" ");
  const total = flat.length + 1;
  const [cursor, setCursor] = useState(8);

  useEffect(() => {
    const id = window.setInterval(() => {
      setCursor((c) => (c + 1) % total);
    }, 600);
    return () => window.clearInterval(id);
  }, [total]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const wrap = el.getBoundingClientRect();
    const idx = Math.min(cursor, flat.length - 1);
    const charEl = el.querySelectorAll<HTMLSpanElement>("[data-char]")[idx];
    if (!charEl) return;
    const r = charEl.getBoundingClientRect();
    setTarget({
      left: r.left - wrap.left,
      top: r.top - wrap.top,
      w: r.width,
      h: r.height,
    });
  }, [cursor, flat]);

  return (
    <div className="rounded-md border border-border bg-card px-5 py-6">
      <div
        ref={containerRef}
        className="relative mx-auto w-fit font-mono text-2xl leading-[1.6] text-muted-foreground sm:text-3xl"
      >
        {[...flat].map((ch, i) => (
          <span
            key={i}
            data-char
            className={i < cursor ? "text-foreground" : ""}
          >
            {ch === " " ? " " : ch}
          </span>
        ))}
        {target && settings.style !== "off" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: 0,
              top: 0,
              width: target.w,
              height: target.h,
              transform: `translate3d(${target.left}px, ${target.top}px, 0)`,
              transition:
                settings.smoothSpeed > 0
                  ? `transform ${settings.smoothSpeed}ms cubic-bezier(.22, 0.8, 0.22, 1)`
                  : "none",
            }}
          >
            <CaretShape
              style={settings.style}
              width={settings.width}
              radius={settings.radius}
              blinkSpeed={settings.blinkSpeed}
              charW={target.w}
              charH={target.h}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────

export function CaretRow() {
  const { settings, update, reset, isCustomised } = useCaretSettings();

  return (
    <div className="flex flex-col gap-3">
      <HeroPreview settings={settings} />

      <SettingsRow
        label="Style"
        control={
          <ChipGroup>
            {STYLES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={settings.style === s.id}
                onClick={() => update({ style: s.id })}
                preview={
                  <StyleChipPreview
                    style={s.id}
                    width={settings.width}
                    radius={settings.radius}
                  />
                }
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Thickness"
        control={
          <ChipGroup>
            {THICKNESS_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={settings.width === p.value}
                onClick={() => update({ width: p.value })}
                preview={<ThicknessChipPreview width={p.value} />}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Roundness"
        control={
          <ChipGroup>
            {RADIUS_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={settings.radius === p.value}
                onClick={() => update({ radius: p.value })}
                preview={<RoundnessChipPreview radius={p.value} />}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Blink"
        control={
          <ChipGroup>
            {BLINK_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={settings.blinkSpeed === p.value}
                onClick={() => update({ blinkSpeed: p.value })}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Smooth"
        control={
          <ChipGroup>
            {SMOOTH_PRESETS.map((p) => (
              <Chip
                key={p.label}
                label={p.label}
                active={settings.smoothSpeed === p.value}
                onClick={() => update({ smoothSpeed: p.value })}
              />
            ))}
          </ChipGroup>
        }
      />

      {isCustomised ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={reset}>
            Reset to default
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export type { CaretSettings };
