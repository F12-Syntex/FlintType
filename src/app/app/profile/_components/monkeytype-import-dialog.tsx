"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { BackendError, useBackend } from "@/lib/backend";

const APE_KEYS_URL = "https://monkeytype.com/account-settings?tab=apeKeys";

/** Import-from-MonkeyType dialog. Walks the user through generating
 *  an Ape Key, then submits it to backend.monkeytype.import which
 *  fetches and bulk-inserts their MT results into the local tests
 *  table. The dialog persists the result message inline so the user
 *  sees the count without a toast layer. */
export function MonkeyTypeImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const backend = useBackend();
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; imported: number; skipped: number }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  async function handleImport() {
    const key = apiKey.trim();
    if (key.length === 0) {
      setStatus({ kind: "err", message: "Paste your Ape Key first." });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const out = await backend.monkeytype.import({ apiKey: key });
      setStatus({
        kind: "ok",
        imported: out.imported,
        skipped: out.skipped,
      });
      setApiKey("");
    } catch (err) {
      const message =
        err instanceof BackendError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Import failed.";
      setStatus({ kind: "err", message });
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Reset transient state on close so the next open is clean.
          setStatus({ kind: "idle" });
        }
        onOpenChange(next);
      }}
      title="Import from MonkeyType"
      confirmLabel={status.kind === "loading" ? "Importing…" : "Import"}
      cancelLabel="Close"
      onConfirm={() => void handleImport()}
    >
      <div className="flex flex-col gap-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Bring your historical typing tests in from MonkeyType. We
          read your results via an{" "}
          <span className="text-foreground">Ape Key</span> — a
          read-only token you generate on your MonkeyType account.
        </p>

        <ol className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4 text-sm leading-relaxed">
          <Step n={1}>
            Open{" "}
            <a
              href={APE_KEYS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              MonkeyType account settings · Ape Keys
              <ExternalLink size={12} aria-hidden />
            </a>
          </Step>
          <Step n={2}>
            Click <span className="text-foreground">Generate new key</span>,
            give it any name (e.g. <span className="text-foreground">flinttype</span>),
            and confirm.
          </Step>
          <Step n={3}>
            Copy the key (shown once) and paste it below. We never
            persist it — the key is only used in-flight to fetch your
            results.
          </Step>
        </ol>

        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Ape Key
          </span>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste the key here"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
          />
        </label>

        <StatusLine status={status} />
      </div>
    </ConfirmDialog>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.5rem_1fr] items-baseline gap-2">
      <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {String(n).padStart(2, "0")}
      </span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

function StatusLine({
  status,
}: {
  status:
    | { kind: "idle" }
    | { kind: "loading" }
    | { kind: "ok"; imported: number; skipped: number }
    | { kind: "err"; message: string };
}) {
  if (status.kind === "idle") return null;
  if (status.kind === "loading") {
    return (
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Fetching your results from MonkeyType…
      </p>
    );
  }
  if (status.kind === "ok") {
    return (
      <p className="text-sm text-foreground" role="status">
        Imported{" "}
        <span className="font-mono tabular-nums text-primary">
          {status.imported}
        </span>{" "}
        test{status.imported === 1 ? "" : "s"}
        {status.skipped > 0 ? (
          <>
            {" "}· skipped{" "}
            <span className="font-mono tabular-nums">
              {status.skipped}
            </span>{" "}
            (already in your history)
          </>
        ) : null}
        . Refresh the profile to see them.
      </p>
    );
  }
  return (
    <p className="text-sm text-primary" role="alert">
      {status.message}
    </p>
  );
}
