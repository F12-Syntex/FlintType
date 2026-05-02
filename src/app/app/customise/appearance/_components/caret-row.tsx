"use client";

import { Check } from "lucide-react";
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

const STYLES: ReadonlyArray<{
  id: CaretStyle;
  label: string;
  hint: string;
}> = [
  { id: "line", label: "Line", hint: "default" },
  { id: "block", label: "Block", hint: "overlay" },
  { id: "underline", label: "Under", hint: "below" },
  { id: "outline", label: "Outline", hint: "ring" },
  { id: "off", label: "Off", hint: "hidden" },
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

/** Mini preview of a caret variant — same shape used in the live
 *  passage, just sized down so the tile is scannable. The fake "char"
 *  underneath is a muted rectangle so the variant's relationship to a
 *  glyph is obvious. */
function StylePreview({
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
    <div className="relative h-9 w-9 overflow-hidden rounded-sm">
      {style !== "off" ? (
        <span
          aria-hidden
          className="absolute inset-x-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-foreground/15"
          style={{ width: charW, height: charH }}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
          —
        </span>
      )}
      <Caret
        style={style}
        width={width}
        radius={radius}
        charW={charW}
        charH={charH}
        active={active}
      />
    </div>
  );
}

function Caret({
  style,
  width,
  radius,
  charW,
  charH,
  active,
}: {
  style: CaretStyle;
  width: number;
  radius: number;
  charW: number;
  charH: number;
  active: boolean;
}) {
  if (style === "off") return null;
  // Center over the fake char.
  const baseX = `calc(50% - ${charW / 2}px)`;
  const baseY = `calc(50% - ${charH / 2}px)`;
  const color = active ? "var(--primary)" : "var(--foreground)";
  if (style === "line") {
    return (
      <span
        className="absolute"
        style={{
          width,
          height: charH * 0.85,
          left: `calc(50% - ${charW / 2}px)`,
          top: `calc(50% - ${(charH * 0.85) / 2}px)`,
          backgroundColor: color,
          borderRadius: radius,
        }}
      />
    );
  }
  if (style === "block") {
    return (
      <span
        className="absolute"
        style={{
          width: charW,
          height: charH,
          left: baseX,
          top: baseY,
          backgroundColor: `color-mix(in oklch, ${color} 35%, transparent)`,
          borderRadius: radius,
        }}
      />
    );
  }
  if (style === "underline") {
    return (
      <span
        className="absolute"
        style={{
          width: charW,
          height: width,
          left: baseX,
          top: `calc(50% + ${charH / 2 - width}px)`,
          backgroundColor: color,
          borderRadius: radius,
        }}
      />
    );
  }
  // outline
  return (
    <span
      className="absolute"
      style={{
        width: charW,
        height: charH,
        left: baseX,
        top: baseY,
        border: `${width}px solid ${color}`,
        borderRadius: radius,
      }}
    />
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
        "flex flex-col items-center gap-1 rounded-md border p-2 text-center transition-colors",
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

export function CaretRow() {
  const { settings, update, reset, isCustomised } = useCaretSettings();

  return (
    <Card className="rounded-md shadow-sm ring-border min-h-16">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Caret</CardTitle>
        <CardDescription>
          The cursor that moves through the passage as you type.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <SubSectionLabel>Style</SubSectionLabel>
          <div className="grid grid-cols-5 gap-2">
            {STYLES.map((s) => (
              <PresetChip
                key={s.id}
                label={s.label}
                hint={s.hint}
                active={settings.style === s.id}
                onClick={() => update({ style: s.id })}
                preview={
                  <StylePreview
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
                  <StylePreview
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
                  <StylePreview
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
