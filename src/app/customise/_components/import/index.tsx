"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Undo2 } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { coarsePointer } from "@/lib/tabbable";
import type { ImportSource } from "@/types/settings-import";
import { changeCount } from "@/lib/settings-import/plan";
import { CheckStage } from "./check-stage";
import { ChooseStage } from "./choose-stage";
import { ImportDialogShell } from "./dialog-shell";
import { COPY, dialogTitle } from "./import-copy";
import { enterMotion } from "./import-motion";
import { isDismissible, screenKey, stageKey } from "./import-stage";
import { importButton } from "./review-copy";
import { ResultStage } from "./result-stage";
import { ReviewStage } from "./review-stage";
import { useImportFlow } from "./use-import-flow";

const PRIMARY = "h-11 flex-1 md:h-9 md:flex-none";
const SECONDARY = "h-11 md:h-9";

/** The settings import dialog (ui-law §12.10), shared by the MonkeyType
 *  and flinttype imports: Choose, Checking, Review, Importing, Done. An
 *  import writes only what the review lists, and Done offers Undo. */
export function ImportDialog({
  source,
  open,
  onOpenChange,
}: {
  source: ImportSource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const flow = useImportFlow(source);
  const { state } = flow;
  const { stage } = state;
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const reduce = useReducedMotion();
  const key = stageKey(stage);
  const lastKey = useRef(key);

  const { reset, cancel } = flow;
  useEffect(() => {
    if (open) reset(source);
    else cancel();
  }, [open, source, reset, cancel]);

  // A new screen starts at the top and moves focus to its heading, so a
  // screen reader reads it once. Back at Choose, focus goes to the paste
  // box (the panel on touch, so no keyboard pops up).
  useEffect(() => {
    if (lastKey.current === key) return;
    lastKey.current = key;
    const panel = panelRef.current;
    if (!panel || !open) return;
    const body = panel.querySelector<HTMLElement>("[data-import-body]");
    if (body) body.scrollTop = 0;
    const target =
      key !== "choose"
        ? panel.querySelector<HTMLElement>("[data-stage-heading]")
        : coarsePointer()
          ? panel
          : panel.querySelector<HTMLElement>("textarea");
    target?.focus({ preventScroll: true });
  }, [key, open]);

  const close = () => onOpenChange(false);
  const chooseFile = () => fileRef.current?.click();
  const checkText = () => {
    if (state.text.trim()) void flow.check({ text: state.text });
  };
  const fromFile = state.inputKind === "file";

  let footer: ReactNode;
  switch (stage.kind) {
    case "choose":
      footer = (
        <>
          <Button variant="ghost" size="sm" onClick={close} className={SECONDARY}>{COPY.cancel}</Button>
          <Button
            size="sm"
            onClick={checkText}
            disabled={!state.text.trim()}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            className={PRIMARY}
          >
            {COPY.check}
          </Button>
        </>
      );
      break;
    case "check": {
      // The account's settings didn't load: the same input can be checked again.
      const again = stage.failure?.kind === "account-unavailable";
      const retry = again ? COPY.tryAgain : fromFile ? COPY.chooseAnother : COPY.editText;
      const onRetry = again ? flow.retry : fromFile ? chooseFile : flow.backToChoose;
      if (!stage.failure) {
        footer = (
          <>
            <Button variant="ghost" size="sm" onClick={close} className={SECONDARY}>{COPY.cancel}</Button>
            <Button size="sm" disabled className={PRIMARY}>{COPY.checking}</Button>
          </>
        );
      } else if (stage.failure.kind === "other-app" && stage.failure.otherApp) {
        const other = stage.failure.otherApp;
        footer = (
          <>
            <Button variant="outline" size="sm" onClick={onRetry} className={SECONDARY}>{retry}</Button>
            <Button size="sm" onClick={() => flow.importInstead(other)} className={PRIMARY}>{COPY.importInstead}</Button>
          </>
        );
      } else {
        footer = (
          <>
            <Button variant="ghost" size="sm" onClick={close} className={SECONDARY}>{COPY.cancel}</Button>
            <Button size="sm" onClick={onRetry} className={PRIMARY}>{retry}</Button>
          </>
        );
      }
      break;
    }
    case "review": {
      const n = changeCount(stage.plan.groups, new Set(stage.enabled));
      const anything = stage.plan.groups.some((g) => g.items.length > 0);
      footer = anything ? (
        <>
          <Button variant="ghost" size="sm" onClick={close} className={SECONDARY}>{COPY.cancel}</Button>
          <Button size="sm" onClick={() => void flow.importNow()} disabled={n === 0} className={PRIMARY}>
            {importButton(n)}
          </Button>
        </>
      ) : (
        <Button size="sm" onClick={close} className={PRIMARY}>{COPY.done}</Button>
      );
      break;
    }
    case "apply":
      footer = stage.failed ? (
        <Button size="sm" onClick={close} className={PRIMARY}>{COPY.close}</Button>
      ) : (
        <Button size="sm" disabled className={PRIMARY}>{COPY.importing}</Button>
      );
      break;
    case "done":
      // Signed in or out since: Undo would act on someone else's settings.
      footer = stage.undone || stage.undoLost ? (
        <Button size="sm" onClick={close} className={PRIMARY}>{COPY.done}</Button>
      ) : (
        <>
          <Button variant="outline" size="sm" onClick={flow.undo} className={SECONDARY}>
            <Undo2 aria-hidden />
            {COPY.undo}
          </Button>
          <Button size="sm" onClick={close} className={PRIMARY}>{COPY.done}</Button>
        </>
      );
      break;
  }

  return (
    <ImportDialogShell
      open={open}
      onClose={close}
      dismissible={isDismissible(stage)}
      title={dialogTitle(state.source)}
      titleId={titleId}
      panelRef={panelRef}
      footer={footer}
      announcement={flow.announcement}
      onFileDrop={stage.kind === "choose" ? (file) => void flow.check({ file }) : undefined}
      dropLabel={COPY.dropOverlay}
    >
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json,text/plain,.txt"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) void flow.check({ file });
        }}
      />
      {/* Each new screen fades in. Importing, Done and Undone are one
          screen, and a failure on a screen is part of it. */}
      <motion.div key={screenKey(stage)} {...enterMotion("screen", reduce)} className="flex flex-col">
        {stage.kind === "choose" ? (
          <ChooseStage
            source={state.source}
            text={state.text}
            onText={flow.setText}
            onSubmit={checkText}
            onChooseFile={chooseFile}
          />
        ) : stage.kind === "check" ? (
          <CheckStage stage={stage} source={state.source} inputKind={state.inputKind} />
        ) : stage.kind === "review" ? (
          <ReviewStage stage={stage} inputKind={state.inputKind} onToggle={flow.toggle} />
        ) : (
          <ResultStage stage={stage} />
        )}
      </motion.div>
    </ImportDialogShell>
  );
}
