"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const RADIUS_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  rem: number;
  hint: string;
}> = [
  { id: "sharp", label: "Sharp", rem: 0, hint: "0" },
  { id: "subtle", label: "Subtle", rem: 0.125, hint: "2px" },
  { id: "small", label: "Small", rem: 0.25, hint: "4px" },
  { id: "medium", label: "Medium", rem: 0.5, hint: "8px" },
  { id: "large", label: "Large", rem: 0.75, hint: "12px" },
  { id: "pillowy", label: "Pillowy", rem: 1.25, hint: "20px" },
];

function PresetTile({
  rem,
  label,
  hint,
  active,
  onClick,
}: {
  rem: number;
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center gap-2 rounded-md border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted",
      )}
      aria-pressed={active}
    >
      <div
        aria-hidden
        className={cn(
          "h-14 w-14 border-2 transition-colors",
          active ? "border-primary bg-primary/10" : "border-foreground/30 bg-card",
        )}
        style={{ borderRadius: `${rem}rem` }}
      />
      <div className="flex flex-col items-center">
        <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
          {active ? <Check size={11} className="text-primary" /> : null}
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {hint}
        </span>
      </div>
    </button>
  );
}

export function RadiusRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (rem: number) => void;
  onClear: () => void;
}) {
  const numeric = value ? Number.parseFloat(value) : 0.5;
  const matchedPreset = RADIUS_PRESETS.find(
    (p) => Math.abs(p.rem - numeric) < 0.01,
  );

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Corner radius</CardTitle>
        <CardDescription>
          How rounded every surface, button, and card looks. Pick a preset
          below or fine-tune with the slider.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {/* Preview row — three real surfaces using the live radius */}
        <div className="flex items-center justify-center gap-3 rounded-md border border-border bg-muted py-5">
          <div
            aria-hidden
            className="h-10 w-10 border-2 border-primary bg-card"
            style={{ borderRadius: "var(--radius)" }}
          />
          <div
            aria-hidden
            className="h-10 w-16 border border-border bg-background"
            style={{ borderRadius: "var(--radius)" }}
          />
          <span
            aria-hidden
            className="inline-flex h-10 items-center bg-primary px-4 text-sm font-semibold text-primary-foreground"
            style={{ borderRadius: "var(--radius)" }}
          >
            Save
          </span>
        </div>

        {/* Preset tiles */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {RADIUS_PRESETS.map((p) => (
            <PresetTile
              key={p.id}
              rem={p.rem}
              label={p.label}
              hint={p.hint}
              active={matchedPreset?.id === p.id}
              onClick={() => onChange(p.rem)}
            />
          ))}
        </div>

        {/* Slider — full width so it's actually visible */}
        <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/40 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Fine-tune
            </span>
            <Badge variant="outline" className="px-2 tabular-nums">
              {numeric.toFixed(2)}rem
            </Badge>
          </div>
          <Slider
            value={[numeric]}
            min={0}
            max={1.5}
            step={0.05}
            onValueChange={(v) => {
              if (Array.isArray(v) && typeof v[0] === "number") onChange(v[0]);
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
            <span>0</span>
            <span>1.5rem</span>
          </div>
        </div>

        {value !== undefined ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Reset to default
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
