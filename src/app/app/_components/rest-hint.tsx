import { Kbd, Tag } from "@/components/ft";

export function RestHint() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-4">
        <Tag>START TYPING TO BEGIN</Tag>
        <Tag tone="ink">
          <span className="text-ft-dim-2">· OR PRESS </span>
          <Kbd>SPACE</Kbd>
        </Tag>
      </div>
      <div className="flex items-center gap-3">
        <Tag>TODAY&apos;S TARGET</Tag>
        <span className="text-[13px] text-ft-ink">
          break 95 wpm without breaking accuracy
        </span>
        <span className="size-1.5 bg-ft-ember" aria-hidden />
      </div>
    </div>
  );
}
