"use client";

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
import { Chip, ChipGroup } from "../chip";
import { SettingsRow, SwitchRow } from "../row";

/** Key corners at chip-sample scale. A real key is about 40px tall
 *  with `rounded-sm` (the card radius less 4px); the samples are half
 *  that size, so they take half the radius. With the full radius the
 *  20px "Rounded" sample read as a circle, the same as "Pill". */
function sampleShapeClass(shape: KeyboardShape): string {
  return shape === "rounded"
    ? "rounded-[calc((var(--radius)_-_4px)/2)]"
    : shapeClass(shape);
}

/** Mini chip preview — same designClasses as the real keys, two tiny
 *  key tiles (resting + hot) so the chip itself communicates the
 *  variant. */
function DesignChipPreview({
  design,
  shape,
}: {
  design: KeyboardDesign;
  shape: KeyboardShape;
}) {
  const [resting, hot] = designClasses(design);
  const r = sampleShapeClass(shape);
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
        sampleShapeClass(shape),
        resting,
      )}
    />
  );
}

/** How each key looks: its surface and its corners. */
export function KeyStyleRows() {
  const { settings, update } = useKeyboardSettings();

  return (
    <>
      <SettingsRow
        label="Key style"
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
        label="Key shape"
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
    </>
  );
}

/** Small marks on the keys: the F/J homing bumps and shift symbols. */
export function KeyMarkRows() {
  const { settings, update } = useKeyboardSettings();

  return (
    <>
      <SwitchRow
        title="Home row bumps"
        desc="Add the small bumps on F and J that help you find your hands."
        checked={settings.highlightHomeRow}
        onChange={(v) => update({ highlightHomeRow: v })}
      />
      <SwitchRow
        title="Shift symbols"
        desc="Show the small symbol above each number key."
        checked={settings.showShiftLabels}
        onChange={(v) => update({ showShiftLabels: v })}
      />
    </>
  );
}
