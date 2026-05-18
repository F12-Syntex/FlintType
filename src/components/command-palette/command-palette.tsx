"use client";

import { ArrowRight, Check, ChevronRight, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCommandEntries } from "@/lib/command-palette/use-command-entries";
import type {
  CommandEntry,
  CommandGroup as CommandGroupId,
  EnumEntry,
} from "@/lib/command-palette/types";

/** Group order in the rendered list — keep the high-impact controls
 *  at the top, link-only fallbacks lower, navigation last. */
const GROUP_ORDER: readonly CommandGroupId[] = [
  "Mode",
  "Theme",
  "Behaviour",
  "Caret",
  "Keyboard",
  "Appearance",
  "Navigate",
];

type View =
  | { kind: "root" }
  | { kind: "enum"; entry: EnumEntry };

/** The dialog-mounted command palette. Cmd+K opens it; arrow keys +
 *  Enter drive selection; Escape backs out of a sub-view (or closes
 *  the whole thing). Enum entries open a sub-list inline where each
 *  option is its own row — no extra navigation. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "root" });
  const [query, setQuery] = useState("");
  const router = useRouter();
  const entries = useCommandEntries();
  // Direct ref to the search input so we can re-focus it on every
  // open + on view switch — cmdk's Command primitive doesn't always
  // surface a focusable as the first DOM-order element, so Radix's
  // default `onOpenAutoFocus` can land on the dialog content shell
  // instead of the input. Pinning focus here is more reliable.
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd / Ctrl + K toggles the palette. Ignored when the user is
  // already typing into an input — accidental closes on input "k"
  // would be horrible — except for the shortcut itself.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset view + query when the dialog closes so the next open is
  // always a clean root view, not whatever sub-list the user was in.
  useEffect(() => {
    if (!open) {
      setView({ kind: "root" });
      setQuery("");
    }
  }, [open]);

  // Re-pin focus to the search input on every open and on every
  // view switch. Radix Dialog runs `onOpenAutoFocus` once, after
  // which a view switch (root ↔ enum sub-list) re-renders a new
  // <CommandInput>; without this the new input mounts unfocused.
  useEffect(() => {
    if (!open) return;
    // rAF so the input is in the DOM before we call .focus(); a
    // sync focus right after setState lands before the layout
    // effects that mount the new input.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, view.kind]);

  // Escape inside a sub-view backs out to the root rather than closing
  // the whole dialog. The Dialog's own Escape close still fires when
  // we're already on root, which is the right behaviour.
  //
  // Tab + Shift+Tab are swallowed (preventDefault, no other action)
  // so Radix's focus trap doesn't shift the highlight off the input.
  // The earlier "tab closes the palette" rule was a step too far —
  // the right behaviour is "tab does nothing visible", keeping focus
  // pinned to the search field so the user can keep typing.
  const onKeyDownInside = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape" && view.kind !== "root") {
        e.preventDefault();
        e.stopPropagation();
        setView({ kind: "root" });
        setQuery("");
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [view.kind],
  );

  // Grouped + ordered entries for the root view. Memoised because
  // entries identity is itself memoised in the hook.
  const grouped = useMemo(() => {
    const byGroup = new Map<CommandGroupId, CommandEntry[]>();
    for (const entry of entries) {
      const bucket = byGroup.get(entry.group) ?? [];
      bucket.push(entry);
      byGroup.set(entry.group, bucket);
    }
    return GROUP_ORDER.flatMap((g) => {
      const items = byGroup.get(g);
      return items ? [{ group: g, items }] : [];
    });
  }, [entries]);

  function runEntry(entry: CommandEntry) {
    switch (entry.kind) {
      case "action":
        entry.run();
        setOpen(false);
        return;
      case "toggle":
        entry.set(!entry.value);
        // Don't close — toggles are the kind of thing the user might
        // flip multiple in one session. Refresh keeps the palette
        // open with the new value visible.
        return;
      case "enum":
        setView({ kind: "enum", entry });
        setQuery("");
        return;
      case "link":
        router.push(entry.href);
        setOpen(false);
        return;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="overflow-hidden p-0 sm:max-w-xl"
        hideClose
        onKeyDownCapture={onKeyDownInside}
      >
        <DialogTitle className="sr-only">
          {view.kind === "root"
            ? "Command palette"
            : `Pick a value for ${view.entry.label}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Search every setting, switch theme, navigate. Arrow keys to move,
          Enter to act, Escape to back out.
        </DialogDescription>

        <Command
          shouldFilter
          // cmdk filters case-insensitively across visible item text
          // by default; the explicit value below is so the matcher
          // also indexes our extra search tokens.
          filter={(value, search) => {
            const v = value.toLowerCase();
            const s = search.toLowerCase();
            return v.includes(s) ? 1 : 0;
          }}
        >
          {view.kind === "root" ? (
            <RootView
              groups={grouped}
              query={query}
              setQuery={setQuery}
              runEntry={runEntry}
              inputRef={inputRef}
            />
          ) : (
            <EnumView
              entry={view.entry}
              query={query}
              setQuery={setQuery}
              onPick={(id) => {
                view.entry.set(id);
                setView({ kind: "root" });
                setQuery("");
              }}
              onBack={() => {
                setView({ kind: "root" });
                setQuery("");
              }}
              inputRef={inputRef}
            />
          )}

          <Footer view={view} />
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function RootView({
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

function EnumView({
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
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          // tabIndex -1 so Radix's focus trap doesn't land here on
          // Tab — the user reaches Back via mouse / Esc, not Tab,
          // and we want focus to stay on the search input.
          tabIndex={-1}
          onClick={onBack}
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Back
        </button>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground">
          {entry.label}
        </span>
      </div>
      <CommandInput
        ref={inputRef}
        value={query}
        onValueChange={setQuery}
        placeholder={`Pick a value for ${entry.label.toLowerCase()}`}
        autoFocus
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
              >
                <span className="flex h-4 w-4 items-center justify-center">
                  {active ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : null}
                </span>
                <span className="text-sm">{opt.label}</span>
                {active ? (
                  <CommandShortcut>Current</CommandShortcut>
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
              ? "rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary"
              : "rounded-md border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
          }
        >
          {entry.value ? "On" : "Off"}
        </span>
      );
    case "enum": {
      const current =
        entry.options.find((o) => o.id === entry.value)?.label ?? entry.value;
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{current}</span>
          <ChevronRight className="h-3 w-3" />
        </span>
      );
    }
    case "link":
      return (
        <span className="flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{entry.destination}</span>
          <ExternalLink className="h-3 w-3" />
        </span>
      );
    case "action":
      return (
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground"
          aria-hidden
        />
      );
  }
}

function Footer({ view }: { view: View }) {
  return (
    <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
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
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-border bg-background px-1 text-[9px] font-medium uppercase tracking-[0.14em] text-foreground">
      {children}
    </kbd>
  );
}
