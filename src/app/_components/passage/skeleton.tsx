/** Skeleton shown while an adaptive batch is loading. Three pulsing
 *  bars matching the passage line geometry (font scale, line-height
 *  rules) so the swap to real text is a content drop-in, not a layout
 *  shift. Marked `motion-safe:` so reduced-motion users get a static
 *  block instead of a pulse. */
export function AdaptLoadingSkeleton() {
  // Three lines mirrors the default `linesRendered` cap. Widths drop a
  // little per line so the block reads as paragraph shape, not a
  // uniform grid. `bg-foreground/8` is dim enough on light theme to
  // sit calmly under any palette without competing with the caret.
  const widths = ["100%", "94%", "78%"];
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading adaptive passage"
      className="relative flex h-full w-full items-start"
    >
      <div
        className="flex w-full flex-col gap-3 text-[calc(var(--ft-font-scale,1)*1.75rem)] leading-[2.1] sm:text-[calc(var(--ft-font-scale,1)*2.125rem)] sm:leading-[2.2] lg:text-[calc(var(--ft-font-scale,1)*2.5rem)] lg:leading-[2.3]"
        aria-hidden
      >
        {widths.map((w, i) => (
          <span
            key={i}
            className="block h-[1em] rounded-sm bg-foreground/[0.08] motion-safe:animate-pulse"
            style={{ width: w, animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <span className="sr-only">Loading adaptive passage…</span>
    </div>
  );
}
