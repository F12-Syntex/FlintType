"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// ─── Caret rendering primitive ──────────────────────────────────────
// Used by the hero preview AND mirrored in passage.tsx, so what the
// user sees up top is exactly what lands in the live passage.

function CaretShape({
  style,
  width,
  radius,
  blink,
  charW,
  charH,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  blink: boolean;
  charW: number;
  charH: number;
}) {
  if (style === "off") return null;

  const animation = blink ? "ft-blink 1s steps(2) infinite" : undefined;
  const common: React.CSSProperties = {
    position: "absolute",
    borderRadius: radius,
    animation,
    backgroundColor: "var(--primary)",
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

// ─── Hero preview ──────────────────────────────────────────────────

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

// ─── Plain chip group ──────────────────────────────────────────────
// Text-only chips. The hero preview above is the single source of
// truth for "what does this look like" — having a mini preview inside
// every chip turns the card into a wall of carets.

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ControlRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
      <span className="w-24 shrink-0 text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:text-xs">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 transition-colors hover:bg-muted"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
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
          The cursor that moves through the passage. The preview below cycles
          live so you see what each setting does.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <HeroPreview settings={settings} />

        <ControlRow label="Style">
          {STYLES.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              active={settings.style === s.id}
              onClick={() => update({ style: s.id })}
            />
          ))}
        </ControlRow>

        <ControlRow label="Thickness">
          {THICKNESS_PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              active={settings.width === p.value}
              onClick={() => update({ width: p.value })}
            />
          ))}
        </ControlRow>

        <ControlRow label="Roundness">
          {RADIUS_PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              active={settings.radius === p.value}
              onClick={() => update({ radius: p.value })}
            />
          ))}
        </ControlRow>

        <div className="grid gap-2 sm:grid-cols-2">
          <ToggleRow
            label="Blink"
            on={settings.blink}
            onChange={(v) => update({ blink: v })}
          />
          <ToggleRow
            label="Smooth motion"
            on={settings.smooth}
            onChange={(v) => update({ smooth: v })}
          />
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
