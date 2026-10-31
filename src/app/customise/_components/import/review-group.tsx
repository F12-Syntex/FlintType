import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ImportGroup } from "@/types/settings-import";
import { ChangeTable } from "./change-table";
import { settingsCount } from "./import-copy";
import { groupSwitchLabel } from "./review-copy";

/** Up to six of the group's new colours, as overlapping dots. */
function swatches(group: ImportGroup): string[] {
  const seen = new Set<string>();
  for (const i of group.items) if (i.swatch) seen.add(i.swatch.toLowerCase());
  return [...seen].slice(0, 6);
}

/** One row of the review list: name and count (expands to the change
 *  table), a hairline, and the switch that keeps it in or out. */
export function ReviewGroup({
  group,
  enabled,
  onToggle,
}: {
  group: ImportGroup;
  enabled: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const captionId = useId();
  const dots = swatches(group);
  return (
    <li>
      <div className="flex items-center gap-3 px-4 py-1.5 sm:px-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <span className="min-w-0 flex-1">
            <span className={cn("block text-sm font-medium", enabled ? "text-foreground" : "text-muted-foreground")}>
              {group.name}
            </span>
            <span id={captionId} className="block text-xs text-muted-foreground tabular-nums">
              {settingsCount(group.items.length)}
            </span>
          </span>
          {dots.length > 0 ? (
            <span
              aria-hidden
              className={cn(
                "flex shrink-0 -space-x-1 transition-opacity duration-200 motion-reduce:transition-none",
                !enabled && "opacity-35 saturate-0",
              )}
            >
              {dots.map((c) => (
                <span
                  key={c}
                  className="size-5 rounded-full ring-2 ring-card outline outline-1 -outline-offset-1 outline-foreground/15"
                  style={{ backgroundColor: c }}
                />
              ))}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
        <span aria-hidden className="h-6 w-px shrink-0 bg-border" />
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          aria-label={groupSwitchLabel(group.name)}
          aria-describedby={captionId}
          className="after:-inset-y-3"
        />
      </div>
      {open ? (
        <div
          id={panelId}
          className={cn("border-t border-border/70 px-4 pt-3 pb-3 sm:px-5", !enabled && "opacity-60")}
        >
          {group.note ? <p className="mb-2 text-xs text-muted-foreground">{group.note}</p> : null}
          <ChangeTable groupName={group.name} items={group.items} />
        </div>
      ) : null}
    </li>
  );
}
