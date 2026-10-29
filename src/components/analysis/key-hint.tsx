import { Kbd } from "@/components/ft";
import { cn } from "@/lib/utils";

type KeyHintProps = {
  keys: string[];
  label: string;
  className?: string;
};

/** One keyboard hint: a keycap per key, then its label ("tab New
 *  passage"). Space a group of hints with `gap-x-4`, never a glyph. */
export function KeyHint({ keys, label, className }: KeyHintProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex items-center">
        {keys.map((k) => (
          <Kbd key={k}>{k}</Kbd>
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}
