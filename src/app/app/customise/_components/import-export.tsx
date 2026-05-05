"use client";

import { Download, Upload } from "lucide-react";
import {
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  buildFlinttypeExport,
  downloadJson,
  type ImportPlan,
  planFlinttypeImport,
  planMonkeytypeImport,
} from "@/lib/import-export";
import { cn } from "@/lib/utils";

type Source = "flinttype" | "monkeytype";

/** Vertical Import/Export action panel — three flat rows, one per
 *  action. Lives in the bottom of the desktop settings sidebar and at
 *  the bottom of the mobile section-picker bottom sheet.
 *
 *  Imports are two-phase: the file picker resolves to a *plan*, the
 *  user reviews the plan in a <ConfirmDialog> showing every slice that
 *  will change, then commits. Misclicks are recoverable — Cancel does
 *  nothing — and the user can see exactly what they're about to swap. */
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
          msg: "Nothing matched — file had no recognized settings.",
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
