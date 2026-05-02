"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        "group flex flex-col items-center gap-3 rounded-md border p-3 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-muted",
      )}
      aria-pressed={active}
    >
      {/* Live preview: a real button using THIS preset's radius so you
          see what each option looks like on a control surface, all at
          once. */}
      <span
        aria-hidden
        className="inline-flex h-9 w-full items-center justify-center bg-primary px-3 text-xs font-semibold text-primary-foreground"
        style={{ borderRadius: `${rem}rem` }}
      >
        Save
      </span>
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
          below.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {/* Preset tiles — each tile previews its own radius on a button */}
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
