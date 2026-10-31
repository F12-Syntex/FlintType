"use client";

import { ArrowDownUp, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildFlinttypeExport,
  downloadJson,
  type ImportPlan,
  planFlinttypeImport,
} from "@/lib/import-export";
import { cn } from "@/lib/utils";
import { MonkeytypeImportDialog } from "./monkeytype-import";

type Source = "flinttype" | "monkeytype";

/** The "Import / export" menu in every settings page header. Export
 *  downloads a JSON file. A flinttype import lists every slice it will
 *  write in a ConfirmDialog before committing; a MonkeyType import runs
 *  in its own step-by-step dialog (`./monkeytype-import`). */
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
  // A fresh File each pick, so picking the same file again re-runs.
  const [monkeytypeFile, setMonkeytypeFile] = useState<File | null>(null);

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
    if (sourceRef.current === "monkeytype") {
      setMonkeytypeFile(file);
      return;
    }
    try {
      const text = await file.text();
      const json: unknown = JSON.parse(text);
      const next = planFlinttypeImport(json);
      if (next.changes.length === 0) {
        setStatus({
          ok: true,
          msg: "Nothing to import: the file had no settings we recognise.",
        });
        return;
      }
      setPlan(next);
    } catch (err) {
      setStatus({
        ok: false,
        msg:
          err instanceof SyntaxError
            ? "That file isn't valid JSON."
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
        msg: `Imported ${n} section${n === 1 ? "" : "s"} from flinttype.`,
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
            className="size-9 px-0 sm:h-8 sm:w-auto sm:px-3"
          >
            <ArrowDownUp aria-hidden />
            <span className="hidden sm:inline">Import / export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[15rem]">
          <DropdownMenuItem
            onSelect={() => void handleExport()}
            className="min-h-11 gap-2 sm:min-h-0"
          >
            <Download size={14} aria-hidden className="text-muted-foreground" />
            Export settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => chooseFile("flinttype")}
            className="min-h-11 gap-2 sm:min-h-0"
          >
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            Import flinttype settings
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => chooseFile("monkeytype")}
            className="min-h-11 gap-2 sm:min-h-0"
          >
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            Import MonkeyType settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {status ? (
        <p
          className={cn(
            // Under the button: left-aligned on phones, where the header
            // actions sit at the left edge (right-anchored, the message
            // ran off-screen), right-aligned from sm.
            "absolute top-full left-0 z-10 mt-2 w-max max-w-[calc(100vw-2rem)] text-left text-xs leading-snug sm:right-0 sm:left-auto sm:max-w-xs sm:text-right",
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

      <MonkeytypeImportDialog
        file={monkeytypeFile}
        onChooseAnother={() => chooseFile("monkeytype")}
      />
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
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <header className="flex items-baseline justify-between gap-2 border-b border-border bg-background/40 px-3 py-2">
              <span className="text-sm font-semibold text-foreground">
                {c.label}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
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
