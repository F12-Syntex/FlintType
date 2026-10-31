"use client";

import { ArrowDownUp, Download, Upload } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buildFlinttypeExport, downloadJson } from "@/lib/settings-export";
import { cn } from "@/lib/utils";
import type { ImportSource } from "@/types/settings-import";
import { ImportDialog } from "./import";

/** The "Import / export" menu in every settings page header (ui-law
 *  §12.7). Export downloads a file at once; each import opens the import
 *  dialog (§12.10), which checks the file, shows what will change and
 *  can undo it. The status line under the button is for Export only. */
export function ImportExportMenu({ className }: { className?: string }) {
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importing, setImporting] = useState<ImportSource | null>(null);
  // Keeps the dialog's title while it slides out.
  const [source, setSource] = useState<ImportSource>("monkeytype");

  async function handleExport() {
    setStatus(null);
    try {
      const data = await buildFlinttypeExport();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJson(`flinttype-settings-${stamp}.json`, data);
      setStatus({ ok: true, msg: "Settings exported." });
    } catch {
      setStatus({ ok: false, msg: "Your settings couldn't be exported. Try again." });
    }
  }

  function openImport(next: ImportSource) {
    setStatus(null);
    setSource(next);
    setImporting(next);
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
          <DropdownMenuItem onSelect={() => void handleExport()} className="min-h-11 gap-2 sm:min-h-0">
            <Download size={14} aria-hidden className="text-muted-foreground" />
            Export settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openImport("flinttype")} className="min-h-11 gap-2 sm:min-h-0">
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            Import flinttype settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openImport("monkeytype")} className="min-h-11 gap-2 sm:min-h-0">
            <Upload size={14} aria-hidden className="text-muted-foreground" />
            Import MonkeyType settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {status ? (
        <p
          className={cn(
            // Under the button: left-aligned on phones, where the header
            // actions sit at the left edge, right-aligned from sm.
            "absolute top-full left-0 z-10 mt-2 w-max max-w-[calc(100vw-2rem)] text-left text-xs leading-snug sm:right-0 sm:left-auto sm:max-w-xs sm:text-right",
            status.ok ? "text-muted-foreground" : "text-destructive",
          )}
          role={status.ok ? undefined : "alert"}
        >
          {status.msg}
        </p>
      ) : null}

      <ImportDialog
        source={importing ?? source}
        open={importing !== null}
        onOpenChange={(next) => {
          if (!next) setImporting(null);
        }}
      />
    </div>
  );
}
