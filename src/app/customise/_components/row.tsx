"use client";

import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { LabelWithDesc } from "./controls";

/** One settings row inside a section's grouped list (ui-law §12.1):
 *  label (+ one-line description) on the left, the control on the
 *  right, separated from its neighbours by the list's hairlines.
 *
 *  - Wide controls (chip rows, segmented switches, sliders) stack under
 *    the label on phones and sit right from `sm` up.
 *  - `inline` keeps short controls (a swatch, the mode toggle, a small
 *    number input) beside the label at every width.
 *  - `preview` renders a full-width strip under the row for the rare
 *    control whose effect a chip sample can't show.
 *  - `id` makes the row an anchor target (`#tape`, `#mistakes`). */
export function SettingsRow({
  label,
  control,
  preview,
  inline = false,
  id,
  className,
}: {
  label: ReactNode;
  control: ReactNode;
  preview?: ReactNode;
  inline?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <div
      id={id}
      className={cn("flex scroll-mt-20 flex-col gap-3 px-4 lg:scroll-mt-8 py-3.5 sm:px-5", className)}
    >
      <div
        className={cn(
          "min-h-8",
          inline
            ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:gap-8"
            : "flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(9rem,1fr)_auto] sm:items-center sm:gap-8",
        )}
      >
        {typeof label === "string" ? <LabelWithDesc title={label} /> : label}
        {control ? (
          <div
            className={cn(
              "flex min-w-0 items-center",
              inline ? "justify-end" : "sm:justify-end",
            )}
          >
            {control}
          </div>
        ) : null}
      </div>
      {preview ? <div className="text-muted-foreground">{preview}</div> : null}
    </div>
  );
}

/** A plain on/off setting: the whole row is the switch's label, so the
 *  tap target is the full row (≥ 56px) rather than the 40px track. */
export function SwitchRow({
  title,
  desc,
  checked,
  onChange,
  id,
  disabled = false,
}: {
  title: ReactNode;
  desc?: ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <label
      id={id}
      className={cn(
        "grid min-h-14 scroll-mt-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 sm:gap-8 sm:px-5 lg:scroll-mt-8",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      )}
    >
      <LabelWithDesc title={title} desc={desc} />
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => onChange(next)}
      />
    </label>
  );
}
