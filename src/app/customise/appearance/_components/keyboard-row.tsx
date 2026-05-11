"use client";

import { Button } from "@/components/ui/button";
import {
  designClasses,
  KEYBOARD_DESIGNS,
  KEYBOARD_SHAPES,
  type KeyboardDesign,
  type KeyboardShape,
  shapeClass,
  useKeyboardSettings,
} from "@/lib/keyboard-settings";
import { cn } from "@/lib/utils";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

/** Mini chip preview — same designClasses + shapeClass, two tiny key
 *  tiles (resting + hot) so the chip itself communicates the variant. */
function DesignChipPreview({
  design,
  shape,
}: {
  design: KeyboardDesign;
  shape: KeyboardShape;
}) {
  const [resting, hot] = designClasses(design);
  const r = shapeClass(shape);
  return (
    <span className="flex gap-0.5">
      <span
        className={cn("block h-5 w-3.5 border text-[0px]", r, resting)}
      />
      <span
        className={cn("block h-5 w-3.5 border text-[0px]", r, hot)}
      />
    </span>
  );
}

function ShapeChipPreview({
  shape,
  design,
}: {
  shape: KeyboardShape;
  design: KeyboardDesign;
}) {
  const [resting] = designClasses(design);
  return (
    <span
      className={cn(
        "block h-5 w-5 border text-[0px]",
        shapeClass(shape),
        resting,
      )}
    />
  );
}

const TOGGLE: ReadonlyArray<{ label: string; value: boolean }> = [
  { label: "Off", value: false },
  { label: "On", value: true },
];

export function KeyboardRow() {
  const { settings, update, reset, isCustomised } = useKeyboardSettings();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label="Design"
        control={
          <ChipGroup>
            {KEYBOARD_DESIGNS.map((d) => (
              <Chip
                key={d.id}
                label={d.label}
                active={settings.design === d.id}
                onClick={() => update({ design: d.id })}
                preview={
                  <DesignChipPreview design={d.id} shape={settings.shape} />
                }
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Shape"
        control={
          <ChipGroup>
            {KEYBOARD_SHAPES.map((s) => (
              <Chip
                key={s.id}
                label={s.label}
                active={settings.shape === s.id}
                onClick={() => update({ shape: s.id })}
                preview={
                  <ShapeChipPreview shape={s.id} design={settings.design} />
                }
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Compact"
        control={
          <ChipGroup>
            {TOGGLE.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                active={settings.compact === t.value}
                onClick={() => update({ compact: t.value })}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Home pegs"
        control={
          <ChipGroup>
            {TOGGLE.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                active={settings.highlightHomeRow === t.value}
                onClick={() => update({ highlightHomeRow: t.value })}
              />
            ))}
          </ChipGroup>
        }
      />

      <SettingsRow
        label="Shift labels"
        control={
          <ChipGroup>
            {TOGGLE.map((t) => (
              <Chip
                key={t.label}
                label={t.label}
                active={settings.showShiftLabels === t.value}
                onClick={() => update({ showShiftLabels: t.value })}
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
