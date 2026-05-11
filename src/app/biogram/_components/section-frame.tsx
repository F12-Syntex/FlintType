import { Tag } from "@/components/ft";
import { cn } from "@/lib/utils";
import { InView } from "./in-view";

/** Anchored section shell with eyebrow, optional subtitle, optional
 *  right-aligned actions slot. Generous mobile-first vertical padding;
 *  body slot is the section content itself. */
export function SectionFrame({
  id,
  label,
  subtitle,
  actions,
  children,
  className,
}: {
  id: string;
  label: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-6 border-b border-foreground/10 px-5 py-12 sm:px-14 sm:py-16",
        className,
      )}
    >
      <InView>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <span className="inline-block h-px w-6 bg-primary" aria-hidden />
              <Tag>{label}</Tag>
            </div>
            {subtitle ? (
              <p className="max-w-xl text-[12.5px] leading-relaxed text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
        <div>{children}</div>
      </InView>
    </section>
  );
}
