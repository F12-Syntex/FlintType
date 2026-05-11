"use client";

import { Download, MoreHorizontal, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildFlinttypeExport,
  downloadJson,
  type ImportPlan,
  planFlinttypeImport,
  planMonkeytypeImport,
} from "@/lib/import-export";
import { cn } from "@/lib/utils";

type Source = "flinttype" | "monkeytype";

/** Single Import / Export trigger — sits next to "Reset all" in the
 *  customise page header. Opens a small dropdown with the three
 *  actions; no more vertical 3-button panel cluttering the sidebar
 *  footer. Imports are still two-phase: file picker → ConfirmDialog
 *  showing every slice that will change → commit. */
export function ImportExportMenu({
  className,
}: {
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sourceRef = useRef<Source>("flinttype");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [plan, setPlan] = useState<ImportPlan | null>(null);

  async function handleExport() {
    setStatus(null);
    try {
      const data = await buildFlinttypeExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`flinttype-settings-${stamp}.json`, data);
      setStatus({ ok: true, msg: "Settings exported." });
    } catch (err) {
      setStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Export failed.",
      });
    }
  }

  function chooseFile(source: Source) {
    sourceRef.current = source;
    setStatus(null);
    fileRef.current?.click();
  }

  async function handleFile(file: File) {
    setStatus(null);
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const source = sourceRef.current;
      const next =
        source === "flinttype"
          ? planFlinttypeImport(json)
          : planMonkeytypeImport(json);
      if (next.changes.length === 0) {
        setStatus({
          ok: true,
          msg: "Nothing matched — file had no recognised settings.",
        });
        return;
      }
      setPlan(next);
    } catch (err) {
      setStatus({
        ok: false,
        msg:
          err instanceof SyntaxError
            ? "Could not parse JSON — is the file valid?"
            : err instanceof Error
              ? err.message
              : "Import failed.",
      });
    }
  }

  function commitImport() {
    if (!plan) return;
    try {
      const n = plan.apply();
      setStatus({
        ok: true,
        msg: `Imported ${n} section${n === 1 ? "" : "s"} from ${
          plan.source === "flinttype" ? "flinttype" : "MonkeyType"
        }.`,
      });
    } catch (err) {
      setStatus({
        ok: false,
        msg: err instanceof Error ? err.message : "Import failed.",
      });
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            aria-label="Import or export settings"
            className="gap-1.5"
          >
            <MoreHorizontal size={14} aria-hidden />
            <span className="hidden sm:inline">Manage</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Settings file
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => void handleExport()}
            className="gap-2"
          >
            <Download size={14} aria-hidden className="text-muted-foreground" />
            Export settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Restore from
          </DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => chooseFile("flinttype")}
            className="gap-2"
          >
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            flinttype JSON
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => chooseFile("monkeytype")}
            className="gap-2"
          >
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            MonkeyType JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {status ? (
        <p
          className={cn(
            "absolute right-0 top-full mt-2 max-w-xs text-right text-[11px] leading-snug",
            status.ok ? "text-muted-foreground" : "text-destructive",
          )}
          role={status.ok ? undefined : "alert"}
        >
          {status.msg}
        </p>
      ) : null}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <ConfirmDialog
        open={plan !== null}
        onOpenChange={(next) => {
          if (!next) setPlan(null);
        }}
        title={plan?.title ?? "Confirm import"}
        confirmLabel="Apply import"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        onConfirm={commitImport}
      >
        {plan ? <ImportSummary plan={plan} /> : null}
      </ConfirmDialog>
    </div>
  );
}

function ImportSummary({ plan }: { plan: ImportPlan }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        This will overwrite the following section
        {plan.changes.length === 1 ? "" : "s"} in your current settings.
        Anything not listed stays untouched.
      </p>
      <ul className="flex flex-col gap-2.5">
        {plan.changes.map((c) => (
          <li
            key={c.slice}
            className="overflow-hidden rounded-md border border-border bg-card"
          >
            <header className="flex items-baseline justify-between gap-2 border-b border-border bg-background/40 px-3 py-2">
              <span className="text-sm font-semibold text-foreground">
                {c.label}
              </span>
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {c.slice}
              </span>
            </header>
            {c.details && c.details.length > 0 ? (
              <dl className="grid grid-cols-[minmax(7rem,max-content)_1fr] gap-x-4 gap-y-1.5 px-3 py-2.5 text-xs">
                {c.details.map((d, i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted-foreground">{d.key}</dt>
                    <dd className="truncate font-medium text-foreground tabular-nums">
                      {d.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
