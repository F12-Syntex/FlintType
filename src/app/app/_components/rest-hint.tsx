"use client";

import { Kbd, Tag } from "@/components/ft";
import { usePractice } from "./practice-state";

export function RestHint() {
  const { state, wpm } = usePractice();

  if (state.phase === "done") {
    return (
      <div className="flex flex-wrap items-stretch justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-ft-ember bg-ft-ember/[0.06] px-4 py-2.5">
          <Tag tone="ember">RUN COMPLETE</Tag>
          <span className="text-[13px] font-medium text-ft-ink">
            you typed {state.words.length} words at{" "}
            <span className="text-ft-ember">{wpm} wpm</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-ft-line-soft bg-ft-paper-2/40 px-4 py-2.5">
          <Tag>RESTART</Tag>
          <span className="text-[11px] tracking-wide text-ft-dim-2">
            · press
          </span>
          <Kbd>TAB</Kbd>
        </div>
      </div>
    );
  }

  if (state.phase === "running") {
    return (
      <div className="flex flex-wrap items-stretch justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 border-l-2 border-ft-ember bg-ft-ember/[0.06] px-4 py-2.5">
          <Tag tone="ember">● RECORDING</Tag>
          <span className="text-[11px] tracking-wide text-ft-dim-2">
            · keep typing
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-3 border border-dashed border-ft-line-soft bg-ft-paper-2/40 px-4 py-2.5">
          <Tag>CANCEL</Tag>
          <span className="text-[11px] tracking-wide text-ft-dim-2">
            · press
          </span>
          <Kbd>ESC</Kbd>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-stretch justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 border border-dashed border-ft-line-soft bg-ft-paper-2/40 px-4 py-2.5">
        <Tag tone="ember">START TYPING TO BEGIN</Tag>
        <span className="text-[11px] tracking-wide text-ft-dim-2">
          · just start
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-l-2 border-ft-ember bg-ft-ember/[0.06] px-4 py-2.5">
        <Tag tone="ember">TODAY&apos;S TARGET</Tag>
        <span className="text-[13px] font-medium text-ft-ink">
          break 95 wpm without breaking accuracy
        </span>
        <span className="size-1.5 bg-ft-ember" aria-hidden />
      </div>
    </div>
  );
}
