"use client";

import {
  type AutoHideMode,
  type FooterStyle,
  type TopbarStyle,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import { Chip, ChipGroup } from "../chip";
import { LabelWithDesc } from "../controls";
import { SettingsRow } from "../row";
import { AutoHideSample, FooterSample, TopbarSample } from "./chip-previews";

const TOPBAR: ReadonlyArray<{ id: TopbarStyle; label: string }> = [
  { id: "elevated", label: "Raised" },
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
      label="Top bar"
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
      label="Footer"
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
      label={
        <LabelWithDesc
          title="While typing"
          desc="Dim or hide the top bar and footer during a test."
        />
      }
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
      inline
      label={
        <LabelWithDesc
          title="Focus mode"
          desc={
            <>
              Press <Key>F</Key> outside a text field to hide everything
              but the text. <Key>Esc</Key> brings it back.
            </>
          }
        />
      }
      control={null}
    />
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-muted px-1 font-mono text-[11px] text-foreground">
      {children}
    </kbd>
  );
}
