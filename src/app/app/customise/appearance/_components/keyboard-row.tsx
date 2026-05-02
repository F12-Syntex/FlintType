"use client";

import { Keyboard } from "@/app/app/_components/keyboard";
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

/** Force the home-row pegs into the lit state so the design's hot
 *  palette is visible in the preview without anyone typing. */
const PREVIEW_LIT = new Set(["KeyF", "KeyJ"]);

function KeyboardPreviewStrip({ design }: { design: KeyboardDesign }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 sm:p-5">
      <Keyboard design={design} forcedPressed={PREVIEW_LIT} />
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
