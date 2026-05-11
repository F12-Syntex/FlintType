import type { LucideIcon } from "lucide-react";

/** A single physical key on a US ANSI 60% layout. `code` matches
 *  KeyboardEvent.code so the highlight reads the *physical* key the user
 *  pressed, regardless of which OS layout (Dvorak, Colemak, …) is active. */
export type KeyDef = {
  code: string;
  label?: string;
  shiftLabel?: string;
  icon?: LucideIcon;
  /** Width in keyboard units. 1u = standard letter key. */
  units?: number;
  variant?: "letter" | "modifier";
};

export type KeyboardLayout = {
  id: string;
  name: string;
  rows: readonly (readonly KeyDef[])[];
};
