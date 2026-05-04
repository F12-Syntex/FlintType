"use client";

import {
  type Keymap,
  type KeymapLegend,
  type KeymapStyle,
  type KeymapTopRow,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { LAYOUTS, type LayoutId } from "@/app/app/_components/keyboard/layouts";
import {
  LabelWithDesc,
  SelectChips,
  SliderRow,
} from "../../_components/controls";
import { SettingsRow } from "../../_components/row";

const KEYMAP_OPTIONS: readonly { id: Keymap; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "static", label: "Static" },
  { id: "react", label: "React" },
  { id: "next", label: "Next" },
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

const LEGEND_OPTIONS: readonly { id: KeymapLegend; label: string }[] = [
  { id: "lowercase", label: "Lower" },
  { id: "uppercase", label: "Upper" },
  { id: "blank", label: "Blank" },
  { id: "dynamic", label: "Dynamic" },
];

const TOP_ROW_OPTIONS: readonly { id: KeymapTopRow; label: string }[] = [
  { id: "always", label: "Always" },
  { id: "layout", label: "Layout" },
  { id: "never", label: "Never" },
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
    </div>
  );
}
