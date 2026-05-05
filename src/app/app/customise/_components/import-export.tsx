"use client";

import { Download, Upload } from "lucide-react";
import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  buildFlinttypeExport,
  downloadJson,
  importFlinttype,
  importMonkeytype,
} from "@/lib/import-export";
import { cn } from "@/lib/utils";

type Source = "flinttype" | "monkeytype";

/** Vertical Import/Export action panel — three flat rows, one per
 *  action. Lives in the bottom of the desktop settings sidebar and at
 *  the bottom of the mobile section-picker bottom sheet. Replaces the
 *  old `<ImportExportControls>` that used to sit in the customise
 *  header (icon-only on mobile, text+chevron dropdown on desktop) —
 *  the sidebar/footer slot is the right home for them: they're tools
 *  for managing the section list, not chrome for browsing it. */
export function ImportExportPanel({
  className,
}: {
  className?: string;
}) {
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
            ? "Nothing matched in that file."
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
    <div className={cn("flex flex-col gap-0.5", className)}>
      <PanelLabel>Manage</PanelLabel>
      <PanelButton
        onClick={() => void handleExport()}
        icon={<Download size={14} />}
        title="Download your current settings as a JSON file"
      >
        Export settings
      </PanelButton>
      <PanelButton
        onClick={() => chooseFile("flinttype")}
        icon={<Upload size={14} />}
        title="Restore settings from a flinttype export"
      >
        Import flinttype
      </PanelButton>
      <PanelButton
        onClick={() => chooseFile("monkeytype")}
        icon={<Upload size={14} />}
        title="Map a monkeytype.com settings JSON"
      >
        Import MonkeyType
      </PanelButton>
      {status ? (
        <p
          className={cn(
            "mt-1 px-2 text-[11px] leading-snug",
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
    </div>
  );
}

function PanelLabel({ children }: { children: ReactNode }) {
  return (
    <span className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
      {children}
    </span>
  );
}

function PanelButton({
  icon,
  children,
  ...rest
}: {
  icon: ReactNode;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-foreground/5 hover:text-foreground active:bg-foreground/10",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground">
        {icon}
      </span>
      <span className="flex-1 truncate">{children}</span>
    </button>
  );
}
