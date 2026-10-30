import { User } from "lucide-react";

/** The top-bar account trigger's face: the Clerk photo when there is
 *  one, else the first letter of the display name in a soft circle, or a
 *  plain person glyph while the name is still loading (or empty). */
export function AccountAvatar({
  initial,
  src,
}: {
  initial: string;
  src: string | null;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden
        className="size-8 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex size-8 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary ring-1 ring-primary/20"
    >
      {initial === "" ? <User className="size-4 text-muted-foreground" /> : initial}
    </span>
  );
}
