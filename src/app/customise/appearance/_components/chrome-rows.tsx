"use client";

import {
  type AutoHideMode,
  type FooterStyle,
  type TopbarStyle,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { Chip, ChipGroup } from "../../_components/chip";
import { SettingsRow } from "../../_components/row";
import { AutoHideSample, FooterSample, TopbarSample } from "./chip-previews";

const TOPBAR: ReadonlyArray<{ id: TopbarStyle; label: string }> = [
  { id: "elevated", label: "Elevated" },
  { id: "flat", label: "Flat" },
  { id: "text-only", label: "Text only" },
];

const FOOTER: ReadonlyArray<{ id: FooterStyle; label: string }> = [
  { id: "visible", label: "Visible" },
  { id: "compact", label: "Compact" },
  { id: "hidden", label: "Hidden" },
];

const AUTOHIDE: ReadonlyArray<{ id: AutoHideMode; label: string }> = [
  { id: "off", label: "Off" },
  { id: "dim", label: "Dim" },
  { id: "fade", label: "Fade" },
];

export function TopbarStyleRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Topbar style"
      control={
        <ChipGroup>
          {TOPBAR.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.topbarStyle === p.id}
              onClick={() => update("topbarStyle", p.id)}
              preview={<TopbarSample mode={p.id} />}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function FooterStyleRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Footer style"
      control={
        <ChipGroup>
          {FOOTER.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.footerStyle === p.id}
              onClick={() => update("footerStyle", p.id)}
              preview={<FooterSample mode={p.id} />}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function AutoHideRow() {
  const { prefs, update } = useAppearancePrefs();
  return (
    <SettingsRow
      label="Auto-hide while typing"
      control={
        <ChipGroup>
          {AUTOHIDE.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              active={prefs.autoHide === p.id}
              onClick={() => update("autoHide", p.id)}
              preview={<AutoHideSample mode={p.id} />}
            />
          ))}
        </ChipGroup>
      }
    />
  );
}

export function FocusShortcutHint() {
  return (
    <SettingsRow
      label="Focus mode"
      control={
        <span className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
            F
          </kbd>{" "}
          anywhere outside an input to dim everything but the passage.{" "}
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          restores.
        </span>
      }
    />
  );
}
