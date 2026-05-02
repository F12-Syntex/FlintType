"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type CaretSettings,
  type CaretStyle,
  useCaretSettings,
} from "@/lib/caret-settings";
import { cn } from "@/lib/utils";

const STYLES: ReadonlyArray<{ id: CaretStyle; label: string }> = [
  { id: "line", label: "Line" },
  { id: "block", label: "Block" },
  { id: "underline", label: "Under" },
  { id: "outline", label: "Outline" },
  { id: "off", label: "Off" },
];

const THICKNESS_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "S", value: 1 },
  { label: "M", value: 2 },
  { label: "L", value: 3 },
  { label: "XL", value: 4 },
];

const RADIUS_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Sharp", value: 0 },
  { label: "Soft", value: 2 },
  { label: "Round", value: 6 },
];

// ─── Caret rendering primitive ──────────────────────────────────────
// Used by both the hero preview and the per-chip mini previews so the
// shape the user sees in the chip == the shape that lands in the
// passage.

function CaretShape({
  style,
  width,
  radius,
  blink,
  charW,
  charH,
  color = "var(--primary)",
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  blink: boolean;
  charW: number;
  charH: number;
  color?: string;
}) {
  if (style === "off") return null;

  const animation = blink ? "ft-blink 1s steps(2) infinite" : undefined;
  const common: React.CSSProperties = {
    position: "absolute",
    borderRadius: radius,
    animation,
  };

  if (style === "line") {
    return (
      <span
        aria-hidden
        style={{
          ...common,
          width,
          height: charH * 0.85,
          left: 0,
          top: (charH - charH * 0.85) / 2,
          backgroundColor: color,
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        aria-hidden
        style={{
          ...common,
          width: charW,
          height: charH,
          left: 0,
          top: 0,
          backgroundColor: `color-mix(in oklch, ${color} 35%, transparent)`,
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        aria-hidden
        style={{
          ...common,
          width: charW,
          height: width,
          left: 0,
          top: charH - width,
          backgroundColor: color,
        }}
      />
    );
  }
  // outline
  return (
    <span
      aria-hidden
      style={{
        ...common,
        width: charW,
        height: charH,
        left: 0,
        top: 0,
        border: `${width}px solid ${color}`,
      }}
    />
  );
}

// ─── Hero preview ──────────────────────────────────────────────────
// A line of fake passage text with the live caret cycling through it.
// This is the "no guesswork" surface — you see exactly what you'll get
// in the live passage as you tweak settings.

const PREVIEW_WORDS = ["the", "quick", "brown", "fox", "jumps"];

function HeroPreview({ settings }: { settings: CaretSettings }) {
  const total = PREVIEW_WORDS.join(" ").length + 1;
  const [cursor, setCursor] = useState(8); // start mid-word

  // Slowly march the caret across the preview line so the smooth /
  // blink toggles are visible at a glance.
  useEffect(() => {
    const id = window.setInterval(() => {
      setCursor((c) => (c + 1) % total);
    }, 600);
    return () => window.clearInterval(id);
  }, [total]);

  const flat = PREVIEW_WORDS.join(" ");
  // Build per-char spans + attach a ref to the target char.
  const [target, setTarget] = useState<{
    left: number;
    top: number;
    w: number;
    h: number;
  } | null>(null);
  const containerRef = (el: HTMLDivElement | null) => {
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
  };

  return (
    <div className="rounded-md border border-border bg-muted/30 px-5 py-6">
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
            {ch === " " ? " " : ch}
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
              transition: settings.smooth
                ? "transform 110ms cubic-bezier(.22, 0.8, 0.22, 1)"
                : "none",
            }}
          >
            <CaretShape
              style={settings.style}
              width={settings.width}
              radius={settings.radius}
              blink={settings.blink}
              charW={target.w}
              charH={target.h}
            />
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ─── Chip + small preview helpers ───────────────────────────────────

function ChipPreview({
  style,
  width,
  radius,
  active,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  active: boolean;
}) {
  const charW = 22;
  const charH = 28;
  return (
    <div className="relative h-9 w-9">
      {style !== "off" ? (
        <span
          aria-hidden
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-foreground/15"
          style={{ width: charW, height: charH }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
          —
        </span>
      )}
      <span
        className="absolute"
        style={{
          left: `calc(50% - ${charW / 2}px)`,
          top: `calc(50% - ${charH / 2}px)`,
          width: charW,
          height: charH,
        }}
      >
        <CaretShape
          style={style}
          width={width}
          radius={radius}
          blink={false}
          charW={charW}
          charH={charH}
          color={active ? "var(--primary)" : "var(--foreground)"}
        />
      </span>
    </div>
  );
}

function PresetChip({
  label,
  hint,
  active,
  onClick,
  preview,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onClick: () => void;
  preview?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md border p-2 text-center transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted",
      )}
    >
      {preview}
      <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider">
        {active ? <Check size={10} className="text-primary" /> : null}
        {label}
      </span>
      {hint ? (
        <span className="text-[9px] text-muted-foreground">{hint}</span>
      ) : null}
    </button>
  );
}

function SubSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </span>
  );
}

function ToggleRow({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <span className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{desc}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full border p-0.5 transition-colors",
          on
            ? "border-primary bg-primary"
            : "border-muted-foreground/40 bg-muted",
        )}
      >
        <span
          className={cn(
            "size-4 rounded-full transition-transform",
            on
              ? "translate-x-4 bg-primary-foreground"
              : "translate-x-0 bg-muted-foreground",
          )}
        />
      </span>
    </button>
  );
}

// ─── Card ──────────────────────────────────────────────────────────

export function CaretRow() {
  const { settings, update, reset, isCustomised } = useCaretSettings();

  return (
    <Card className="rounded-md shadow-sm ring-border min-h-16">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Caret &amp; cursor</CardTitle>
        <CardDescription>
          The cursor that moves through the passage as you type. The preview
          below cycles live so you see exactly what you'll get.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <HeroPreview settings={settings} />

        <div className="flex flex-col gap-2">
          <SubSectionLabel>Style</SubSectionLabel>
          <div className="grid grid-cols-5 gap-2">
            {STYLES.map((s) => (
              <PresetChip
                key={s.id}
                label={s.label}
                active={settings.style === s.id}
                onClick={() => update({ style: s.id })}
                preview={
                  <ChipPreview
                    style={s.id}
                    width={settings.width}
                    radius={settings.radius}
                    active={settings.style === s.id}
                  />
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SubSectionLabel>Thickness</SubSectionLabel>
          <div className="grid grid-cols-4 gap-2">
            {THICKNESS_PRESETS.map((p) => (
              <PresetChip
                key={p.label}
                label={p.label}
                hint={`${p.value}px`}
                active={settings.width === p.value}
                onClick={() => update({ width: p.value })}
                preview={
                  <ChipPreview
                    style={settings.style === "off" ? "line" : settings.style}
                    width={p.value}
                    radius={settings.radius}
                    active={settings.width === p.value}
                  />
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SubSectionLabel>Roundness</SubSectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {RADIUS_PRESETS.map((p) => (
              <PresetChip
                key={p.label}
                label={p.label}
                hint={`${p.value}px`}
                active={settings.radius === p.value}
                onClick={() => update({ radius: p.value })}
                preview={
                  <ChipPreview
                    style={settings.style === "off" ? "line" : settings.style}
                    width={settings.width}
                    radius={p.value}
                    active={settings.radius === p.value}
                  />
                }
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <SubSectionLabel>Motion</SubSectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleRow
              label="Blink"
              desc="Pulse the caret on a 1s cycle"
              on={settings.blink}
              onChange={(v) => update({ blink: v })}
            />
            <ToggleRow
              label="Smooth motion"
              desc="Glide between characters instead of jumping"
              on={settings.smooth}
              onChange={(v) => update({ smooth: v })}
            />
          </div>
        </div>

        {isCustomised ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              Reset to default
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

export type { CaretSettings };
