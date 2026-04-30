import { cn } from "@/lib/utils";
import { Tag } from "./tag";

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-ft-line-soft bg-[#FAF7F0] p-5 sm:p-6",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title ? <Tag tone="ink">{title}</Tag> : <span />}
          {subtitle ? <Tag>{subtitle}</Tag> : null}
        </div>
      )}
      {children}
    </div>
  );
}
