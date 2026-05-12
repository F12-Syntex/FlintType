"use client";

import { Check, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import type {
  LeaderboardScope,
  LeaderboardWindow,
} from "@/types/leaderboard";
import { parseScope, parseWindow, SCOPES, WINDOWS } from "./filters";

function useLeaderboardParams() {
  const router = useRouter();
  const params = useSearchParams();
  const scope = parseScope(params.get("scope"));
  const window_ = parseWindow(params.get("window"));

  const setParams = useCallback(
    (next: Partial<{ scope: LeaderboardScope; window: LeaderboardWindow }>) => {
      const sp = new URLSearchParams(params.toString());
      const nextScope = next.scope ?? scope;
      const nextWindow = next.window ?? window_;
      if (nextScope === "all") sp.delete("scope");
      else sp.set("scope", nextScope);
      if (nextWindow === "all_time") sp.delete("window");
      else sp.set("window", nextWindow);
      const qs = sp.toString();
      router.replace(`/leaderboard${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [params, router, scope, window_],
  );

  return { scope, window_, setParams };
}

/** Desktop rail — two grouped lists (Mode + Window) keyed off URL
 *  params. Mirrors /customise sidebar structure: section eyebrow,
 *  vertical list of options, active row marked with a primary tick on
 *  the left rule. */
export function LeaderboardSidebar() {
  const { scope, window_, setParams } = useLeaderboardParams();
  return (
    <nav
      data-ft-chrome
      aria-label="Leaderboard filters"
      className={cn(
        "hidden bg-background/85 backdrop-blur-md",
        "lg:flex lg:h-full lg:flex-col lg:overflow-hidden",
        "lg:rounded-md lg:border lg:border-border",
      )}
    >
      <div className="shrink-0 border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Leaderboard
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <Group title="Mode">
          {SCOPES.map((o) => (
            <RailItem
              key={o.id}
              label={o.label}
              active={o.id === scope}
              onClick={() => setParams({ scope: o.id })}
            />
          ))}
        </Group>

        <Group title="Window">
          {WINDOWS.map((o) => (
            <RailItem
              key={o.id}
              label={o.label}
              active={o.id === window_}
              onClick={() => setParams({ window: o.id })}
            />
          ))}
        </Group>
      </div>
    </nav>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 px-2">
      <span className="block px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </span>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function RailItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-md py-1.5 pr-3 pl-3 text-sm transition-colors",
          active
            ? "bg-foreground/[0.04] text-foreground"
            : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
        )}
      >
        {active ? (
          <span
            aria-hidden
            className="absolute top-1.5 bottom-1.5 left-0.5 w-0.5 rounded-full bg-primary"
          />
        ) : null}
        <span className="font-medium">{label}</span>
      </button>
    </li>
  );
}

/** Mobile picker — single bottom-sheet trigger that opens a list of
 *  Mode + Window options. The header bar of the mobile layout shows
 *  "Mode · Window" as the trigger label so the user can see the
 *  current slice at a glance. */
export function MobileLeaderboardPicker() {
  const { scope, window_, setParams } = useLeaderboardParams();
  const [open, setOpen] = useState(false);

  const scopeLabel = SCOPES.find((s) => s.id === scope)?.label ?? "All modes";
  const windowLabel =
    WINDOWS.find((w) => w.id === window_)?.label ?? "All time";

  function pickScope(id: LeaderboardScope) {
    setParams({ scope: id });
  }
  function pickWindow(id: LeaderboardWindow) {
    setParams({ window: id });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filters — ${scopeLabel}, ${windowLabel}, tap to change`}
        className={cn(
          "inline-flex h-9 max-w-[70vw] items-center gap-1.5 rounded-md px-2 -ml-2",
          "text-base font-semibold tracking-tight text-foreground",
          "transition-colors hover:bg-foreground/5 active:bg-foreground/10",
        )}
      >
        <span className="truncate">
          {scopeLabel}
          <span className="text-muted-foreground"> · {windowLabel}</span>
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={cn(
            "shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      <MobileSheet open={open} onOpenChange={setOpen} title="Filters">
        <div className="flex h-full flex-col">
          <ul className="flex flex-col">
            <SheetGroup title="Mode" />
            {SCOPES.map((o) => (
              <SheetRow
                key={o.id}
                label={o.label}
                active={scope === o.id}
                onClick={() => pickScope(o.id)}
              />
            ))}
            <SheetGroup title="Window" />
            {WINDOWS.map((o) => (
              <SheetRow
                key={o.id}
                label={o.label}
                active={window_ === o.id}
                onClick={() => pickWindow(o.id)}
              />
            ))}
          </ul>
        </div>
      </MobileSheet>
    </>
  );
}

function SheetGroup({ title }: { title: string }) {
  return (
    <li className="border-b border-border bg-background/40">
      <span className="block px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </span>
    </li>
  );
}

function SheetRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li className="border-b border-border">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
          active
            ? "bg-foreground/[0.04]"
            : "hover:bg-foreground/5 active:bg-foreground/10",
        )}
      >
        <span
          className={cn(
            "inline-flex h-4 w-4 shrink-0 items-center justify-center",
            active ? "text-primary" : "text-transparent",
          )}
        >
          <Check size={14} />
        </span>
        <span
          className={cn(
            "flex-1 text-sm",
            active ? "font-semibold text-foreground" : "text-foreground/85",
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
}
