import type { MtPlan } from "./types";
import type { MtImportFailure } from "./use-monkeytype-import";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const settingsCount = (n: number) => plural(n, "setting", "settings");

/** "12 settings will change, and 4 already match." */
export function reviewLead(plan: MtPlan): string {
  const change = `${plural(plan.changes, "setting", "settings")} will change`;
  if (plan.alreadyMatch === 0) return `${change}.`;
  const verb = plan.alreadyMatch === 1 ? "matches" : "match";
  return `${change}, and ${plan.alreadyMatch} already ${verb}.`;
}

/** What stays out of the import, one sentence each. */
export function leftOutLines(plan: MtPlan): string[] {
  const lines: string[] = [];
  if (plan.leavesLook) lines.push("Your theme colours and font stay as they are.");
  if (plan.unmatched > 0) {
    const verb = plan.unmatched === 1 ? "has" : "have";
    lines.push(
      `${plural(plan.unmatched, "other MonkeyType setting", "other MonkeyType settings")} ${verb} no match in flinttype.`,
    );
  }
  return lines;
}

export function importLabel(plan: MtPlan): string {
  return `Import ${plural(plan.changes, "setting", "settings")}`;
}

export function doneTitle(plan: MtPlan): string {
  return `Imported ${plural(plan.changes, "setting", "settings")}`;
}

/** Where the settings ended up, once signed in. */
export function savedLine(savedToAccount: boolean): string {
  if (savedToAccount) return "Saved to your account.";
  return "Saved on this device for now. We'll save them to your account next time you open flinttype.";
}

/** Signed out: the first words of the second sentence are a sign-in link. */
export const SAVED_SIGNED_OUT = {
  lead: "Saved on this device.",
  link: "Sign in",
  rest: "to keep them on every device.",
} as const;

export const ERROR_COPY: Record<MtImportFailure, { title: string; text: string }> = {
  "too-big": {
    title: "This file is too big",
    text: "MonkeyType settings are a small file. Check that you picked the right one.",
  },
  "not-json": {
    title: "This isn't a settings file",
    text: "Choose the settings file you exported from MonkeyType.",
  },
  "not-settings": {
    title: "This isn't a settings file",
    text: "Choose the settings file you exported from MonkeyType.",
  },
  flinttype: {
    title: "This is a flinttype settings file",
    text: "Choose Import flinttype settings in the same menu to bring it in.",
  },
  unrecognised: {
    title: "Nothing to bring over",
    text: "This file has no MonkeyType settings that flinttype has too.",
  },
  "read-failed": {
    title: "We couldn't read this file",
    text: "Try choosing it again.",
  },
  "apply-failed": {
    title: "The import stopped",
    text: "Some settings may already have changed. Try importing the file again.",
  },
};
