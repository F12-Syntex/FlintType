"use client";

import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  WORDLIST_IDS,
  wordlistLabel,
  type WordlistId,
} from "@/lib/wordlists/use-wordlist";

/** Searchable picker for the ~440 MonkeyType wordlists. Trigger is
 *  rendered by the parent (mode bar); this component owns the
 *  dialog + search list. Selecting an item calls onPick and closes.
 *
 *  Why a Dialog + cmdk Command: the catalog has 441 entries — a
 *  flat chip group or even a paginated dropdown collapses under
 *  that count. cmdk handles fuzzy search out of the box and the
 *  Dialog primitive gives us the focus-trap + Esc-to-close shape
 *  the rest of the app uses (palette, confirm dialogs). */
export function WordlistPicker({
  open,
  onOpenChange,
  value,
  onPick,
  trigger,
  returnFocusToTyping = false,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  value: string;
  onPick: (id: WordlistId) => void;
  trigger?: React.ReactNode;
  /** On close, focus the practice typing input instead of the control
   *  that opened the picker. For the practice mode bar only: inside the
   *  race lobby settings the typing input sits outside the popover, so
   *  moving focus there would dismiss the popover mid-edit. */
  returnFocusToTyping?: boolean;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  // The control focused when the picker opened. The picker has no Radix
  // trigger, so without this focus would fall back to the page on close
  // (and inside the race lobby settings, out of the popover).
  const openerRef = useRef<HTMLElement | null>(null);

  // Reset query when the dialog closes so the next open starts clean.
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  // Pin focus to the input on every open — cmdk's input isn't always
  // the first focusable in the dialog content, so Radix's default
  // auto-focus can land on the dialog shell instead.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Bucket the catalog so common picks (the English variants) land
  // at the top of the list. Everything else flows under "All".
  const { english, rest } = useMemo(() => {
    const isEnglish = (id: string) =>
      id === "english" || id.startsWith("english_");
    const english = WORDLIST_IDS.filter(isEnglish);
    const rest = WORDLIST_IDS.filter((id) => !isEnglish(id));
    return { english, rest };
  }, []);

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="overflow-hidden p-0 sm:max-w-xl"
          // Focus first enters the dialog from the opener (the search
          // field's autoFocus runs before Radix's open hooks, so this is
          // the one place that still sees where it came from).
          onFocus={(e) => {
            const from = e.relatedTarget;
            if (
              openerRef.current == null &&
              from instanceof HTMLElement &&
              !e.currentTarget.contains(from)
            ) {
              openerRef.current = from;
            }
          }}
          // Mode bar: hand focus back to the typing input instead of the
          // trigger pill, so the next keystroke (and Tab = new passage)
          // goes to the test rather than the mode bar. Elsewhere focus
          // returns to the control that opened the picker.
          onCloseAutoFocus={(e) => {
            const target = returnFocusToTyping
              ? document.querySelector<HTMLInputElement>(
                  'input[aria-label="Typing input"]',
                )
              : openerRef.current;
            openerRef.current = null;
            if (!target?.isConnected) return;
            e.preventDefault();
            target.focus({ preventScroll: true });
          }}
        >
          <DialogTitle className="sr-only">Pick a wordlist</DialogTitle>
          <DialogDescription className="sr-only">
            Search MonkeyType's full catalog of wordlists. Type to
            filter, arrow keys to move, Enter to pick, Esc to close.
          </DialogDescription>
          <Command shouldFilter>
            <CommandInput
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              placeholder="Search 440+ wordlists…"
              autoFocus
              // 16px on phones: iOS zooms the page into a smaller field
              // when it takes focus (and this one focuses on open).
              className="text-base sm:text-sm"
            />
            <CommandList>
              <CommandEmpty>No wordlists match.</CommandEmpty>
              <CommandGroup heading="English">
                {english.map((id) => (
                  <PickerItem
                    key={id}
                    id={id}
                    label={wordlistLabel(id)}
                    active={id === value}
                    onPick={onPick}
                  />
                ))}
              </CommandGroup>
              <CommandGroup heading="All wordlists">
                {rest.map((id) => (
                  <PickerItem
                    key={id}
                    id={id}
                    label={wordlistLabel(id)}
                    active={id === value}
                    onPick={onPick}
                  />
                ))}
              </CommandGroup>
            </CommandList>
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
              <span>{WORDLIST_IDS.length} wordlists from MonkeyType</span>
              <span className="hidden sm:inline">↑↓ move · ↵ pick · esc close</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PickerItem({
  id,
  label,
  active,
  onPick,
}: {
  id: WordlistId;
  label: string;
  active: boolean;
  onPick: (id: WordlistId) => void;
}) {
  return (
    <CommandItem value={`${id} ${label}`} onSelect={() => onPick(id)}>
      {/* shrink-0 so a long name can't squeeze the check column and
       *  knock its row out of line with the others. */}
      <span className="flex size-4 shrink-0 items-center justify-center">
        {active ? <Check className="size-3.5 text-primary" /> : null}
      </span>
      <span className={cn("min-w-0 text-sm", active && "text-primary")}>{label}</span>
      {/* The raw id helps on desktop (it's searchable either way); on a
       *  phone it only crowds the name onto two lines. */}
      <span className="ml-auto hidden shrink-0 font-mono text-[11px] text-muted-foreground/80 sm:inline">
        {id}
      </span>
    </CommandItem>
  );
}
