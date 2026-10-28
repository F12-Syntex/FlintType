"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";

/** The Style section's live preview (ui-law §12.5): the app's real
 *  primitives — a card, the segmented switch, buttons, an input, a
 *  switch and a floating menu — so every Style pick (shape, depth,
 *  glow, font, size) shows on the exact components it changes. The
 *  picks apply globally, so this is the same render the rest of the
 *  app gets; it just puts every affected part side by side. */
export function StylePreview() {
  const [length, setLength] = useState<15 | 30 | 60>(30);
  const [sound, setSound] = useState(true);

  return (
    // A container query, not a viewport one: the same preview sits in a
    // full-width settings section and in a half-width AI studio tile.
    <div className="@container px-4 py-5 sm:px-5 sm:py-6">
      <div className="grid gap-4 @lg:grid-cols-[minmax(0,1fr)_13rem]">
        <Surface className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Ready when you are
            </p>
            <p className="text-sm text-muted-foreground">
              Pick a length, then start typing.
            </p>
          </div>
          <SegmentedControl
            ariaLabel="Test length"
            value={length}
            onValueChange={setLength}
            options={[
              { value: 15, label: "15s" },
              { value: 30, label: "30s" },
              { value: 60, label: "60s" },
            ]}
            className="self-start"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button tabIndex={-1}>Start test</Button>
            <Button tabIndex={-1} variant="outline">
              Drills
            </Button>
          </div>
        </Surface>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative">
            <Search
              size={14}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              tabIndex={-1}
              readOnly
              aria-label="Search (preview)"
              placeholder="Search"
              className="pl-9"
            />
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl border border-border bg-popover p-1.5 text-popover-foreground shadow-float">
            <span className="rounded-xl bg-accent px-2.5 py-2 text-sm text-accent-foreground">
              Profile
            </span>
            <span className="px-2.5 py-2 text-sm text-muted-foreground">
              Settings
            </span>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 px-1 text-sm text-foreground">
            Key sounds
            <Switch checked={sound} onCheckedChange={(v) => setSound(v)} />
          </label>
        </div>
      </div>
    </div>
  );
}
