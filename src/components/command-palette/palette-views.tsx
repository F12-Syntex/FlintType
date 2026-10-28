"use client";

import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { commandKeyLabel } from "@/lib/command-palette/open";
import type {
  CommandEntry,
  CommandGroup as CommandGroupId,
  EnumEntry,
} from "@/lib/command-palette/types";
import { useMounted } from "@/lib/use-mounted";

/** The palette's two views: every entry (root) or one enum's options. */
export type View =
  | { kind: "root" }
  | { kind: "enum"; entry: EnumEntry };

/* ─── Sub-components ──────────────────────────────────────────────── */

export function RootView({
  groups,
  query,
  setQuery,
  runEntry,
  inputRef,
}: {
  groups: { group: CommandGroupId; items: CommandEntry[] }[];
  query: string;
  setQuery: (q: string) => void;
  runEntry: (e: CommandEntry) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder="Search settings, themes, actions…"
        autoFocus
        // 16px on phones so iOS doesn't zoom the page on focus.
        className="text-base sm:text-sm"
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {groups.map(({ group, items }) => (
          <CommandGroup key={group} heading={group}>
            {items.map((entry) => (
              <CommandItem
                key={entry.id}
                // cmdk uses `value` for filter matching — pack the
                // hint + keywords in so search hits beyond the label.
                value={`${entry.label} ${entry.hint ?? ""} ${(entry.keywords ?? []).join(" ")} ${entry.group}`}
                onSelect={() => runEntry(entry)}
              >
                <EntryRow entry={entry} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </>
  );
}

export function EnumView({
  entry,
  query,
  setQuery,
  onPick,
  onBack,
  inputRef,
}: {
  entry: EnumEntry;
  query: string;
  setQuery: (q: string) => void;
  onPick: (id: string) => void;
  onBack: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-2 py-1.5">
        <button
          type="button"
          aria-label="Back to all commands"
          // tabIndex -1 so Radix's focus trap doesn't land here on
          // Tab — the user reaches Back via mouse / Esc, not Tab,
          // and we want focus to stay on the search input.
          tabIndex={-1}
          onClick={onBack}
          className="inline-flex size-11 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:size-7"
        >
          <ArrowLeft className="size-4 sm:size-3.5" aria-hidden />
        </button>
        <span className="text-sm font-medium text-foreground">
          {entry.label}
        </span>
      </div>
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder={`Pick a value for ${entry.label.toLowerCase()}`}
        autoFocus
        className="text-base sm:text-sm"
      />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Options">
          {entry.options.map((opt) => {
            const active = opt.id === entry.value;
            return (
              <CommandItem
                key={opt.id}
                value={`${opt.label} ${opt.id}`}
                onSelect={() => onPick(opt.id)}
                // A finger-sized row on phones; compact from sm.
                className="min-h-11 sm:min-h-0"
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                </span>
                <span className="text-sm">{opt.label}</span>
                {active ? (
                  <CommandShortcut className="text-xs tracking-normal normal-case text-primary">Current</CommandShortcut>
                ) : null}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </>
  );
}

function EntryRow({ entry }: { entry: CommandEntry }) {
  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm">{entry.label}</span>
        {entry.hint ? (
          <span className="truncate text-[11px] text-muted-foreground">
            {entry.hint}
          </span>
        ) : null}
      </div>
      <ValueChip entry={entry} />
    </>
  );
}

function ValueChip({ entry }: { entry: CommandEntry }) {
  switch (entry.kind) {
    case "toggle":
      return (
        <span
          className={
            entry.value
              ? "shrink-0 rounded-pill border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary"
              : "shrink-0 rounded-pill border border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {entry.value ? "On" : "Off"}
        </span>
      );
    case "enum": {
      const current =
        entry.options.find((o) => o.id === entry.value)?.label ?? entry.value;
      return (
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <span>{current}</span>
          <ChevronRight className="h-3 w-3" aria-hidden />
        </span>
      );
    }
    case "link":
      // Where the entry lands, e.g. "Typing · Caret". Hidden on phones
      // so the label keeps the row's width. No trailing arrow: the row
      // itself is the affordance (ui-law §17.5).
      return (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {entry.destination}
        </span>
      );
    case "action":
      return null;
  }
}

export function Footer({ view }: { view: View }) {
  const mounted = useMounted();
  return (
    // Keyboard hints: hidden on phones, where there's no keyboard to
    // use them with.
    <div className="hidden items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground sm:flex">
      <div className="flex items-center gap-3">
        <span>
          <Kbd>↑↓</Kbd> Move
        </span>
        <span>
          <Kbd>↵</Kbd> {view.kind === "root" ? "Act" : "Pick"}
        </span>
        <span>
          <Kbd>Esc</Kbd> {view.kind === "root" ? "Close" : "Back"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Kbd>{mounted ? commandKeyLabel(navigator.platform) : "Ctrl"}</Kbd>
        <Kbd>K</Kbd>
      </div>
    </div>
  );
}


function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-background px-1 font-sans text-[11px] font-medium text-foreground">
      {children}
    </kbd>
  );
}
