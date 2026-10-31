"use client";

import { useAuth } from "@clerk/nextjs";
import { Check, FileWarning } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";
import { useSignInHref } from "@/components/auth/use-sign-in-href";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { coarsePointer } from "@/lib/tabbable";
import { cn } from "@/lib/utils";
import {
  doneTitle,
  ERROR_COPY,
  importLabel,
  leftOutLines,
  SAVED_SIGNED_OUT,
  savedLine,
} from "./copy";
import { ImportReview } from "./review";
import { StepList } from "./step-list";
import { useMonkeytypeImport } from "./use-monkeytype-import";

const BUTTON = "h-11 md:h-9";

/** The MonkeyType settings import: reads the chosen file step by step,
 *  shows every setting that will change, then applies them one group
 *  at a time and saves. Opens whenever `file` changes to a new pick;
 *  `onChooseAnother` reopens the file picker. */
export function MonkeytypeImportDialog({
  file,
  onChooseAnother,
}: {
  file: File | null;
  onChooseAnother: () => void;
}) {
  const { state, start, confirm, close } = useMonkeytypeImport();
  const { stage, plan } = state;
  const { isSignedIn } = useAuth();
  const signInHref = useSignInHref();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (file) void start(file);
  }, [file, start]);

  // Keep focus inside the dialog as the buttons change: on the step
  // list while it runs, then on the stage's main button.
  useEffect(() => {
    if (!state.open || coarsePointer()) return;
    if (stage === "running") stepsRef.current?.focus();
    else if (stage !== "reading") primaryRef.current?.focus();
  }, [stage, state.open]);

  let body: ReactNode;
  let footer: ReactNode;
  if (stage === "reading" || stage === "running") {
    body = <StepList ref={stepsRef} steps={state.steps} label="Import progress" />;
    footer =
      stage === "reading" ? (
        <Button variant="ghost" size="sm" className={BUTTON} onClick={close}>
          Cancel
        </Button>
      ) : (
        <Button size="sm" className={BUTTON} disabled>
          Importing…
        </Button>
      );
  } else if (stage === "review" && plan) {
    body = <ImportReview plan={plan} fileName={state.fileName} />;
    footer = (
      <>
        <Button variant="ghost" size="sm" className={BUTTON} onClick={close}>
          Cancel
        </Button>
        <Button ref={primaryRef} size="sm" className={BUTTON} onClick={() => void confirm()}>
          {importLabel(plan)}
        </Button>
      </>
    );
  } else if (stage === "error") {
    const copy = ERROR_COPY[state.error ?? "read-failed"];
    body = (
      <Notice icon={<FileWarning aria-hidden className="size-5" />} title={copy.title}>
        {copy.text}
      </Notice>
    );
    footer = (
      <>
        <Button variant="ghost" size="sm" className={BUTTON} onClick={close}>
          Close
        </Button>
        <Button ref={primaryRef} size="sm" className={BUTTON} onClick={onChooseAnother}>
          Choose another file
        </Button>
      </>
    );
  } else {
    // nothing | done
    const done = stage === "done" && plan;
    body = done ? (
      <div className="flex flex-col gap-5">
        <Notice icon={<Check aria-hidden className="size-5" strokeWidth={2.5} />} title={doneTitle(plan)} tone="ink">
          {state.savedToAccount !== true && isSignedIn !== true ? (
            <>
              {SAVED_SIGNED_OUT.lead}{" "}
              <Link
                href={signInHref}
                className="font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-primary"
              >
                {SAVED_SIGNED_OUT.link}
              </Link>{" "}
              {SAVED_SIGNED_OUT.rest}
            </>
          ) : (
            savedLine(state.savedToAccount === true)
          )}
        </Notice>
        <StepList steps={state.steps} label="Import steps" showProgress={false} />
      </div>
    ) : (
      <Notice icon={<Check aria-hidden className="size-5" />} title="Nothing to change">
        Your settings already match this file.
        {plan ? ` ${leftOutLines(plan).join(" ")}` : null}
      </Notice>
    );
    footer = (
      <Button ref={primaryRef} size="sm" className={BUTTON} onClick={close}>
        Done
      </Button>
    );
  }

  return (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Import MonkeyType settings"
      footer={footer}
    >
      <div aria-busy={stage === "reading" || stage === "running"}>{body}</div>
    </ConfirmDialog>
  );
}

function Notice({
  icon,
  title,
  tone = "muted",
  children,
}: {
  icon: ReactNode;
  title: string;
  tone?: "muted" | "ink";
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-3 text-center">
      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-full",
          tone === "ink" ? "bg-foreground text-background" : "bg-muted text-foreground",
        )}
      >
        {icon}
      </span>
      <h3 className="text-base font-semibold text-balance text-foreground">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground">{children}</p>
    </div>
  );
}
