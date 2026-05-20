import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
} as const;

const DOT = {
  sm: "size-2",
  md: "size-2.5",
  lg: "size-3",
  xl: "size-3.5",
} as const;

export type AvatarSize = keyof typeof SIZE;

/** A user's Clerk avatar, circular with a hairline ring. flinttype's
 *  surfaces are deliberately inky, so the image is **desaturated at
 *  rest and comes to full colour on hover** of an ancestor `.group`
 *  (set `liven={false}` to opt out where there's no hover affordance).
 *  An optional presence dot rides the bottom-right: `live` is the lone
 *  coral spark (pulsing, motion-safe), `online` is the quiet ok-green.
 *
 *  Avatars are a sanctioned departure from the no-avatars bias — see
 *  ui-law §11. Uses a plain <img> (not next/image) because Clerk's CDN
 *  isn't in next.config remotePatterns and that file is off-limits. */
export function Avatar({
  src,
  alt,
  size = "md",
  status = null,
  liven = true,
  /** Ring colour of the presence dot — match the surface behind it. */
  dotRing = "ring-card",
  className,
}: {
  src: string | null;
  alt: string;
  size?: AvatarSize;
  status?: "live" | "online" | null;
  liven?: boolean;
  dotRing?: string;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn(
            SIZE[size],
            "rounded-full object-cover ring-1 ring-foreground/10",
            liven &&
              "grayscale transition-[filter] duration-300 group-hover:grayscale-0",
          )}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            SIZE[size],
            "rounded-full bg-muted ring-1 ring-foreground/10",
          )}
        />
      )}
      {status ? (
        <span
          aria-label={status === "live" ? "Live now" : "Online"}
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2",
            dotRing,
            DOT[size],
            status === "live"
              ? "bg-primary motion-safe:animate-pulse"
              : "bg-ft-ok",
          )}
        />
      ) : null}
    </span>
  );
}
