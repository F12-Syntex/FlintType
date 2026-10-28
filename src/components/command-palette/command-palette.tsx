"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Command } from "@/components/ui/command";
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
} from "@/lib/command-palette/types";
import { EnumView, Footer, RootView, type View } from "./palette-views";
import { usePaletteOpeners } from "./use-palette-openers";

/** Group order in the rendered list — Practice actions at the top
 *  (Restart test is the highest-frequency command), then high-impact
 *  controls, then navigation last. */
const GROUP_ORDER: readonly CommandGroupId[] = [
  "Practice",
  "Mode",
  "Theme",
  "Behaviour",
  "Caret",
  "Keyboard",
  "Appearance",
  "Navigate",
];

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

  usePaletteOpeners(open, setOpen);

  // Reset view + query when the dialog closes so the next open is
  // always a clean root view, not whatever sub-list the user was in.
  // Adjusted during render (React's "store previous value" pattern)
  // rather than in an effect, so there's no extra cascading render.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) {
      setView({ kind: "root" });
      setQuery("");
    }
  }

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

  // Escape and Tab handled explicitly, no reliance on Radix's default:
  //   - Esc in a sub-view backs out to root (don't close the whole
  //     dialog from a value-picker — user expects step-by-step).
  //   - Esc at root closes the dialog. We own the close instead of
  //     letting Radix's `onEscapeKeyDown` handle it because some
  //     report cases (varying focus state, nested portals) leave the
  //     Radix close path silent.
  //   - Tab is swallowed (preventDefault, no side effect) so Radix's
  //     focus trap doesn't shift the highlight off the input.
  //     Restart is now its own command — pick it from the list (or
  //     type "restart") — Tab-as-restart shortcut was retired.
  const onKeyDownInside = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (view.kind !== "root") {
          setView({ kind: "root" });
          setQuery("");
        } else {
          setOpen(false);
        }
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
        // A 16px gutter each side on phones instead of edge to edge.
        className="w-[calc(100%-2rem)] overflow-hidden p-0 sm:max-w-xl"
        hideClose
        // Radix listens for Escape on the document in the capture
        // phase, so it fires before onKeyDownInside. In a sub-view,
        // stop it from closing the dialog and step back instead.
        onEscapeKeyDown={(e) => {
          if (view.kind === "root") return;
          e.preventDefault();
          setView({ kind: "root" });
          setQuery("");
        }}
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
