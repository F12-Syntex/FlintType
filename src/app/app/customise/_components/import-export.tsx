"use client";

import { ChevronDown, Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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
  importFlinttype,
  importMonkeytype,
} from "@/lib/import-export";

type Source = "flinttype" | "monkeytype";

/** Header strip control: Export downloads the user's prefs blob,
 *  Import opens a dropdown to pick the source format and then a file
 *  chooser to load it. The Import buttons can't be a single one because
 *  the schemas diverge — we need to know which mapper to run before we
 *  read the file. */
export function ImportExportControls() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sourceRef = useRef<Source>("flinttype");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

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
      const n =
        source === "flinttype"
          ? importFlinttype(json)
          : importMonkeytype(json);
      setStatus({
        ok: true,
        msg:
          n === 0
            ? "Nothing matched — file had no recognized settings."
            : `Imported ${n} section${n === 1 ? "" : "s"} from ${
                source === "flinttype" ? "flinttype" : "MonkeyType"
              }.`,
      });
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

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleExport()}
        className="gap-2"
      >
        <Download size={14} />
        Export
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload size={14} />
            Import
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem onSelect={() => chooseFile("flinttype")}>
            <span className="flex flex-col">
              <span>From flinttype</span>
              <span className="text-xs text-muted-foreground">
                A JSON exported here.
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => chooseFile("monkeytype")}>
            <span className="flex flex-col">
              <span>From MonkeyType</span>
              <span className="text-xs text-muted-foreground">
                Your monkeytype.com settings JSON.
              </span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {status ? (
        <span
          className={
            status.ok
              ? "text-xs text-muted-foreground"
              : "text-xs text-destructive"
          }
          role={status.ok ? undefined : "alert"}
        >
          {status.msg}
        </span>
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
    </div>
  );
}
