import { Surface } from "@/components/page-shell";

/** Loading placeholder shaped like the real page (recommended tile,
 *  filter switch, a tile grid) so nothing jumps when data lands. */
export function DrillsSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading drills"
      className="flex flex-col gap-10 motion-safe:animate-pulse sm:gap-12"
    >
      <Surface className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3">
          <span className="h-3 w-32 rounded-full bg-muted" />
          <span className="h-6 w-56 rounded-full bg-muted" />
          <span className="h-3.5 w-full max-w-md rounded-full bg-muted/70" />
        </div>
        <span className="h-11 w-full rounded-pill bg-muted sm:w-36" />
      </Surface>
      <div className="flex flex-col gap-6">
        <span className="h-11 w-full max-w-md rounded-pill bg-muted md:h-10" />
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="h-5 w-36 rounded-full bg-muted" />
            <span className="h-3.5 w-64 max-w-full rounded-full bg-muted/70" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Surface key={i} className="flex flex-col gap-3 p-4 sm:p-5">
                <span className="h-6 w-24 rounded-pill bg-muted" />
                <span className="h-5 w-40 rounded-full bg-muted" />
                <span className="hidden h-3.5 w-full rounded-full bg-muted/70 sm:block" />
                <span className="h-3 w-32 rounded-full bg-muted/70" />
              </Surface>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
