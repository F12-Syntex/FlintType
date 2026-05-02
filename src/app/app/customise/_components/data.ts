/** Setting kinds the UI knows how to render. Each kind maps to a control
 *  in controls.tsx and (optionally) a small live preview in previews.tsx. */
export type ToggleSetting = {
  type: "toggle";
  id: string;
  label: string;
  desc?: string;
  value: boolean;
  preview?: PreviewKind;
};

export type SelectSetting = {
  type: "select";
  id: string;
  label: string;
  desc?: string;
  value: string;
  options: readonly string[];
  preview?: PreviewKind;
};

export type SliderSetting = {
  type: "slider";
  id: string;
  label: string;
  desc?: string;
  value: number;
  min: number;
  max: number;
  preview?: PreviewKind;
};

export type Setting = ToggleSetting | SelectSetting | SliderSetting;

/** Stable keys for the small previews that live under each setting. Only
 *  settings whose effect is *visual* get one — toggles like "Repeated
 *  quotes" show only the label / desc. */
export type PreviewKind =
  | "wpm"
  | "accuracy"
  | "keyboard"
  | "restart-hint"
  | "error-stop"
  | "caret"
  | "theme"
  | "difficulty"
  | "min-word-length"
  | "confidence";

export type Section = {
  id: string;
  name: string;
  settings: readonly Setting[];
};

export const SECTIONS: readonly Section[] = [
  {
    id: "appearance",
    name: "APPEARANCE",
    /** Rendered by the dedicated /app/customise/appearance/page.tsx — a
     *  static route that preempts this generic section renderer. The
     *  stub entries below exist only so the sidebar badge counts the
     *  same number of customizable theme variables that page exposes. */
    settings: [
      { type: "toggle", id: "background", label: "Page background", value: false },
      { type: "toggle", id: "foreground", label: "Body text", value: false },
      { type: "toggle", id: "card", label: "Card surface", value: false },
      { type: "toggle", id: "primary", label: "Primary accent", value: false },
      { type: "toggle", id: "primary-foreground", label: "Primary text", value: false },
      { type: "toggle", id: "accent", label: "Highlight tint", value: false },
      { type: "toggle", id: "accent-foreground", label: "Highlight text", value: false },
      { type: "toggle", id: "muted", label: "Muted surface", value: false },
      { type: "toggle", id: "muted-foreground", label: "Muted text", value: false },
      { type: "toggle", id: "border", label: "Border", value: false },
      { type: "toggle", id: "input", label: "Input track", value: false },
      { type: "toggle", id: "ring", label: "Focus ring", value: false },
      { type: "toggle", id: "radius", label: "Corner radius", value: false },
    ],
  },
  {
    id: "behaviour",
    name: "BEHAVIOUR",
    settings: [
      {
        type: "toggle",
        id: "quick-restart",
        label: "Quick restart",
        desc: "Press Tab to restart instantly without losing focus",
        value: true,
        preview: "restart-hint",
      },
      {
        type: "toggle",
        id: "live-wpm",
        label: "Live WPM",
        desc: "Show WPM ticker during run",
        value: true,
        preview: "wpm",
      },
      {
        type: "toggle",
        id: "live-accuracy",
        label: "Live accuracy",
        desc: "Show accuracy % during run",
        value: true,
        preview: "accuracy",
      },
      {
        type: "toggle",
        id: "live-keyboard",
        label: "Live keyboard",
        desc: "Show the keyboard widget under the passage",
        value: true,
        preview: "keyboard",
      },
      {
        type: "toggle",
        id: "stop-on-error",
        label: "Stop on error",
        desc: "Won't advance until the typo is corrected",
        value: false,
        preview: "error-stop",
      },
      {
        type: "select",
        id: "confidence",
        label: "Confidence mode",
        desc: "Disable backspace · go faster, accept what you get",
        value: "off",
        options: ["off", "word", "all"],
        preview: "confidence",
      },
      {
        type: "slider",
        id: "min-word-length",
        label: "Minimum word length",
        desc: "Filter short words out of the word lists",
        value: 3,
        min: 1,
        max: 8,
        preview: "min-word-length",
      },
      {
        type: "select",
        id: "difficulty",
        label: "Difficulty",
        desc: "Word complexity and punctuation density",
        value: "normal",
        options: ["easy", "normal", "expert", "master"],
        preview: "difficulty",
      },
      {
        type: "toggle",
        id: "show-secondary",
        label: "Show secondary",
        desc: "Numbers and punctuation in word mode",
        value: true,
      },
      {
        type: "toggle",
        id: "blind-mode",
        label: "Blind mode",
        desc: "Hide all live signal · type without seeing what you typed",
        value: false,
      },
    ],
  },
  // Caret & cursor moved under Appearance — see appearance/page.tsx and
  // appearance/_components/caret-row.tsx. Lives next to the rest of the
  // visual customisation so users find it where they expect.
];
