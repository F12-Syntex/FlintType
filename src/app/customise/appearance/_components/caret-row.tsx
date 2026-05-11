"use client";

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

/** Smooth-caret motion presets. The first row is "Off" (no animation
 *  at all); the rest sweep from quick to lazy. Names are atmospheric
 *  on purpose — "Drift" reads better than "Slow" and lines up with the
 *  product's editorial-mechanical feel. Default sits at the slow end
 *  (Glide) which makes the caret feel deliberate. */
const SMOOTH_PRESETS: ReadonlyArray<{ label: string; value: number }> = [
  { label: "Off", value: 0 },
  { label: "Snappy", value: 60 },
  { label: "Smooth", value: 120 },
  { label: "Flow", value: 200 },
  { label: "Glide", value: 300 },
  { label: "Drift", value: 450 },
];

// ─── Caret rendering primitive ──────────────────────────────────────

function CaretShape({
  style,
  width,
  radius,
  charW,
  charH,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  charW: number;
  charH: number;
}) {
  if (style === "off") return null;

  const common: React.CSSProperties = {
    position: "absolute",
    borderRadius: radius,
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

// ─── Per-chip mini previews ────────────────────────────────────────
// Static (no blink) so the rows are scannable; the section preview
// above the rows is where live behaviour shows up.

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

// ─── Card ──────────────────────────────────────────────────────────

export function CaretRow() {
  const { settings, update, reset, isCustomised } = useCaretSettings();

  return (
    <div className="flex flex-col gap-3">
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
