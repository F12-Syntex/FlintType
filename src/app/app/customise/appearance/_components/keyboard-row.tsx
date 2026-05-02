"use client";

import { Button } from "@/components/ui/button";
import {
  designClasses,
  KEYBOARD_DESIGNS,
  type KeyboardDesign,
  useKeyboardSettings,
} from "@/lib/keyboard-settings";
import { cn } from "@/lib/utils";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";

const PREVIEW_KEYS = ["A", "S", "D"] as const;

/** Three-key strip rendered with the actual `designClasses` so the
 *  previews never drift from the live keyboard. The middle key is in
 *  its "pressed" state to show the hot-state colour too. */
function KeyboardPreviewStrip({ design }: { design: KeyboardDesign }) {
  const [resting, hot] = designClasses(design);
  return (
    <div className="rounded-md border border-border bg-card px-6 py-5">
      <div className="mx-auto flex max-w-xs gap-1">
        {PREVIEW_KEYS.map((label, i) => (
          <span
            key={label}
            className={cn(
              "flex h-10 flex-1 items-center justify-center rounded-[6px] border font-mono text-sm",
              i === 1 ? hot : resting,
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Mini chip preview — same designClasses, just two tiny key tiles
 *  (resting + hot) so the chip itself communicates the variant. */
function ChipPreview({ design }: { design: KeyboardDesign }) {
  const [resting, hot] = designClasses(design);
  return (
    <span className="flex gap-0.5">
      <span
        className={cn(
          "block h-5 w-3.5 rounded-[3px] border text-[0px]",
          resting,
        )}
      />
      <span
        className={cn(
          "block h-5 w-3.5 rounded-[3px] border text-[0px]",
          hot,
        )}
      />
    </span>
  );
}

export function KeyboardRow() {
  const { settings, update, reset, isCustomised } = useKeyboardSettings();

  return (
    <div className="flex flex-col gap-3">
      <KeyboardPreviewStrip design={settings.design} />
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
                preview={<ChipPreview design={d.id} />}
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
