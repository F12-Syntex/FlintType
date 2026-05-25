"use client";

import {
  type Keymap,
  type KeymapLegend,
  type KeymapStyle,
  type KeymapTopRow,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { LAYOUTS, type LayoutId } from "@/app/_components/keyboard/layouts";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
  ToggleChips,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const INK = "color-mix(in oklch, var(--foreground) 22%, transparent)";

/** A tiny keycap. `fill` paints the cap (a pressed/next key); otherwise
 *  it's a hairline outline. */
function MiniKey({
  fill,
  children,
}: {
  fill?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-[2px] font-mono text-[8px] leading-none text-foreground"
      style={{ boxShadow: `inset 0 0 0 1px ${INK}`, backgroundColor: fill }}
    >
      {children}
    </span>
  );
}

/** Keymap mode — off shows nothing, static shows bare caps, react fills
 *  a just-pressed key (ink), next flags the upcoming key (coral). */
function KeymapModeSample({ mode }: { mode: Keymap }) {
  if (mode === "off")
    return <span aria-hidden className="block font-mono text-[11px] leading-none text-muted-foreground">—</span>;
  const fill =
    mode === "react"
      ? "color-mix(in oklch, var(--foreground) 22%, transparent)"
      : mode === "next"
        ? "color-mix(in oklch, var(--primary) 30%, transparent)"
        : undefined;
  return (
    <span aria-hidden className="flex items-center gap-0.5">
      <MiniKey />
      <MiniKey fill={mode === "static" ? undefined : fill} />
      <MiniKey />
    </span>
  );
}

/** Legend — what's printed on a cap: lowercase, uppercase, blank, or
 *  (dynamic) the next letter to type. */
function KeymapLegendSample({ legend }: { legend: KeymapLegend }) {
  const glyph =
    legend === "lowercase"
      ? "a"
      : legend === "uppercase"
        ? "A"
        : legend === "dynamic"
          ? "k"
          : "";
  return (
    <span aria-hidden className="flex items-center justify-center">
      <MiniKey fill={legend === "dynamic" ? "color-mix(in oklch, var(--primary) 25%, transparent)" : undefined}>
        {glyph}
      </MiniKey>
    </span>
  );
}

/** Top row — whether the number row sits above the letter grid. */
function KeymapTopRowSample({ mode }: { mode: KeymapTopRow }) {
  return (
    <span aria-hidden className="flex flex-col items-center gap-0.5">
      <span
        className="block h-0.5 w-5 rounded-full"
        style={{ backgroundColor: mode === "never" ? "transparent" : INK }}
      />
      <span className="flex gap-0.5">
        <MiniKey />
        <MiniKey />
        <MiniKey />
      </span>
    </span>
  );
}

/** Compact — full board with a modifier column (off) vs letter grid
 *  only (on). */
function KeymapCompactSample({ on }: { on: boolean }) {
  return (
    <span aria-hidden className="flex items-center gap-0.5">
      {!on ? <MiniKey fill={INK} /> : null}
      <MiniKey />
      <MiniKey />
      <MiniKey />
    </span>
  );
}

const KEYMAP_OPTIONS: readonly {
  id: Keymap;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "off", label: "Off", preview: <KeymapModeSample mode="off" /> },
  { id: "static", label: "Static", preview: <KeymapModeSample mode="static" /> },
  { id: "react", label: "React", preview: <KeymapModeSample mode="react" /> },
  { id: "next", label: "Next", preview: <KeymapModeSample mode="next" /> },
];

const LAYOUT_OPTIONS: readonly { id: LayoutId; label: string }[] = (
  Object.keys(LAYOUTS) as LayoutId[]
).map((id) => ({ id, label: LAYOUTS[id].name }));

const STYLE_OPTIONS: readonly { id: KeymapStyle; label: string }[] = [
  { id: "staggered", label: "Staggered" },
  { id: "matrix", label: "Matrix" },
  { id: "split", label: "Split" },
  { id: "alice", label: "Alice" },
];

const LEGEND_OPTIONS: readonly {
  id: KeymapLegend;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "lowercase", label: "Lower", preview: <KeymapLegendSample legend="lowercase" /> },
  { id: "uppercase", label: "Upper", preview: <KeymapLegendSample legend="uppercase" /> },
  { id: "blank", label: "Blank", preview: <KeymapLegendSample legend="blank" /> },
  { id: "dynamic", label: "Dynamic", preview: <KeymapLegendSample legend="dynamic" /> },
];

const TOP_ROW_OPTIONS: readonly {
  id: KeymapTopRow;
  label: string;
  preview: React.ReactNode;
}[] = [
  { id: "always", label: "Always", preview: <KeymapTopRowSample mode="always" /> },
  { id: "layout", label: "Layout", preview: <KeymapTopRowSample mode="layout" /> },
  { id: "never", label: "Never", preview: <KeymapTopRowSample mode="never" /> },
];

export function KeymapRows() {
  const { prefs, update } = useAppearancePrefs();

  return (
    <div className="flex flex-col gap-3">
      <SettingsRow
        label={
          <LabelWithDesc
            title="Keymap"
            desc="Show your layout while typing. React shows what you pressed; Next shows what to press next."
          />
        }
        control={
          <SelectChips
            value={prefs.keymap}
            options={KEYMAP_OPTIONS}
            onChange={(v) => update("keymap", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Keymap layout"
            desc="Which layout the keymap displays."
          />
        }
        control={
          <SelectChips
            value={prefs.keymapLayout}
            options={LAYOUT_OPTIONS}
            onChange={(v) => update("keymapLayout", v)}
          />
        }
      />

      <SettingsRow
        label={<LabelWithDesc title="Keymap style" desc="Physical layout style." />}
        control={
          <SelectChips
            value={prefs.keymapStyle}
            options={STYLE_OPTIONS}
            onChange={(v) => update("keymapStyle", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Keymap legend"
            desc="How key labels are rendered."
          />
        }
        control={
          <SelectChips
            value={prefs.keymapLegend}
            options={LEGEND_OPTIONS}
            onChange={(v) => update("keymapLegend", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Keymap top row"
            desc="Whether to render the top number row."
          />
        }
        control={
          <SelectChips
            value={prefs.keymapTopRow}
            options={TOP_ROW_OPTIONS}
            onChange={(v) => update("keymapTopRow", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc title="Keymap size" desc="Scale of the keymap." />
        }
        control={
          <SliderRow
            value={prefs.keymapSize}
            min={0.5}
            max={3.5}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onChange={(v) => update("keymapSize", v)}
          />
        }
      />

      <SettingsRow
        label={
          <LabelWithDesc
            title="Compact"
            desc="Drop modifier keys (Tab, Caps, Shift, Ctrl, Alt, Enter, Backspace, Space) and render only the letter grid. Useful when the keymap competes with the typing area for vertical space."
          />
        }
        control={
          <ToggleChips
            value={prefs.keymapCompact}
            onChange={(v) => update("keymapCompact", v)}
            offPreview={<KeymapCompactSample on={false} />}
            onPreview={<KeymapCompactSample on={true} />}
          />
        }
      />
    </div>
  );
}
