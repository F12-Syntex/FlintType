"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ft-keyboard-settings";

export type KeyboardDesign =
  | "solid"
  | "outline"
  | "ghost"
  | "lifted"
  | "glass";

export type KeyboardSettings = {
  design: KeyboardDesign;
};

export const DEFAULT_KEYBOARD: KeyboardSettings = {
  design: "solid",
};

export const KEYBOARD_DESIGNS: ReadonlyArray<{
  id: KeyboardDesign;
  label: string;
}> = [
  { id: "solid", label: "Solid" },
  { id: "outline", label: "Outline" },
  { id: "ghost", label: "Ghost" },
  { id: "lifted", label: "Lifted" },
  { id: "glass", label: "Glass" },
];

function readStored(): KeyboardSettings {
  if (typeof window === "undefined") return DEFAULT_KEYBOARD;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_KEYBOARD;
    const parsed = JSON.parse(raw) as Partial<KeyboardSettings>;
    return { ...DEFAULT_KEYBOARD, ...parsed };
  } catch {
    return DEFAULT_KEYBOARD;
  }
}

function writeStored(settings: KeyboardSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* quota — fine */
  }
}

export function useKeyboardSettings() {
  const [settings, setSettings] = useState<KeyboardSettings>(DEFAULT_KEYBOARD);

  useEffect(() => {
    setSettings(readStored());
  }, []);

  const update = useCallback((patch: Partial<KeyboardSettings>) => {
    setSettings((prev) => {
      const next: KeyboardSettings = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSettings(DEFAULT_KEYBOARD);
  }, []);

  const isCustomised = settings.design !== DEFAULT_KEYBOARD.design;

  return { settings, update, reset, isCustomised } as const;
}

/** Class fragments for each design. Exported separately so the
 *  Appearance preview chips and the live keyboard render the exact
 *  same surface — no drift. Each design returns a tuple of
 *  [resting-state-classes, pressed-state-classes]. */
export function designClasses(design: KeyboardDesign): [string, string] {
  switch (design) {
    case "solid":
      return [
        "border-muted-foreground bg-muted-foreground text-background",
        "border-primary bg-primary text-primary-foreground",
      ];
    case "outline":
      return [
        "border-foreground/30 bg-transparent text-foreground",
        "border-primary bg-primary/15 text-primary",
      ];
    case "ghost":
      return [
        "border-transparent bg-transparent text-foreground",
        "border-transparent bg-primary/15 text-primary",
      ];
    case "lifted":
      return [
        "border-foreground/25 border-b-4 border-b-foreground/35 bg-card text-foreground shadow-sm",
        "border-primary border-b-4 border-b-primary bg-primary/15 text-primary",
      ];
    case "glass":
      return [
        "border-foreground/20 bg-foreground/10 text-foreground backdrop-blur",
        "border-primary bg-primary/30 text-foreground",
      ];
  }
}
