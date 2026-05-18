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
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  value: string;
  onPick: (id: WordlistId) => void;
  trigger?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

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
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
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
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>{WORDLIST_IDS.length} wordlists · powered by MonkeyType</span>
              <span>↑↓ move · ↵ pick · esc close</span>
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
      <span className="flex h-4 w-4 items-center justify-center">
        {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
      </span>
      <span className={cn("text-sm", active && "text-primary")}>{label}</span>
      <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
        {id}
      </span>
    </CommandItem>
  );
}
