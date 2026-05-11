import { cn } from "@/lib/utils";
import { LAYOUTS, type LayoutId } from "./layouts";

export function LayoutPicker({
  active,
  onChange,
}: {
  active: LayoutId;
  onChange: (id: LayoutId) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      {(Object.keys(LAYOUTS) as LayoutId[]).map((id) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            tabIndex={-1}
            onClick={() => onChange(id)}
            className={cn(
              "border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {LAYOUTS[id].name}
          </button>
        );
      })}
    </div>
  );
}
