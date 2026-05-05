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
import { MobileSheet } from "@/components/ui/mobile-sheet";
import {
  buildFlinttypeExport,
  downloadJson,
  importFlinttype,
  importMonkeytype,
} from "@/lib/import-export";
import { useIsMobile } from "@/lib/use-is-mobile";
import { cn } from "@/lib/utils";

type Source = "flinttype" | "monkeytype";

/** Header strip controls: Export downloads the user's prefs blob,
 *  Import opens a picker for the source format and then a file
 *  chooser. Mobile: the trigger buttons collapse to icon-only and the
 *  Import dropdown is replaced by a bottom-up <MobileSheet>. Desktop:
 *  the original outline buttons + dropdown are preserved. */
export function ImportExportControls() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const sourceRef = useRef<Source>("flinttype");
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const isMobile = useIsMobile();

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
    setSheetOpen(false);
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
    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
      {/* Export — icon-only on mobile, icon+label on desktop. */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleExport()}
        aria-label="Export settings"
        className="h-9 w-9 p-0 sm:h-8 sm:w-auto sm:gap-2 sm:px-3"
      >
        <Download size={16} className="shrink-0 sm:size-3.5" />
        <span className="hidden sm:inline">Export</span>
      </Button>

      {/* Import — desktop dropdown stays as before; mobile trigger
          opens a fixed-height bottom sheet. */}
      {isMobile ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSheetOpen(true)}
          aria-label="Import settings"
          className="h-9 w-9 p-0"
        >
          <Upload size={16} className="shrink-0" />
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 px-3">
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
      )}

      <MobileSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title="Import settings"
      >
        <ul className="flex flex-col">
          <SheetSourceItem
            title="From flinttype"
            desc="A JSON file you exported here."
            onSelect={() => chooseFile("flinttype")}
          />
          <SheetSourceItem
            title="From MonkeyType"
            desc="Your monkeytype.com settings JSON."
            onSelect={() => chooseFile("monkeytype")}
          />
        </ul>
      </MobileSheet>

      {status ? (
        <span
          className={cn(
            "ml-1 hidden text-xs sm:inline",
            status.ok ? "text-muted-foreground" : "text-destructive",
          )}
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

function SheetSourceItem({
  title,
  desc,
  onSelect,
}: {
  title: string;
  desc: string;
  onSelect: () => void;
}) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full flex-col gap-1 px-4 py-4 text-left transition-colors hover:bg-foreground/5 active:bg-foreground/10"
      >
        <span className="text-base font-semibold text-foreground">
          {title}
        </span>
        <span className="text-sm text-muted-foreground">{desc}</span>
      </button>
    </li>
  );
}
