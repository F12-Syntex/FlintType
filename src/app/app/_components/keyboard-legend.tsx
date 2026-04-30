import { Tag } from "@/components/ft";

export function KeyboardLegend() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-dashed border-ft-line-soft px-4 py-3.5">
      <Tag>LIVE KEYBOARD APPEARS WHEN YOU START TYPING</Tag>
      <Tag>
        shows next-expected key · hot keys · finger zones · recent presses
      </Tag>
    </div>
  );
}
