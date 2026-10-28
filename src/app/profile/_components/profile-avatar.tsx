import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** The hero avatar, framed by a thin flame ring (the logo gradient) so
 *  the profile reads as flinttype's at a glance. A neutral pulsing disc
 *  while the identity loads; a quiet silhouette when the user has no photo (Clerk's
 *  auto-gradient default is filtered out upstream via `hasImage`). */
export function ProfileAvatar({
  imageUrl,
  isLoaded,
}: {
  imageUrl: string | null;
  isLoaded: boolean;
}) {
  const inner = "size-16 rounded-full border-2 border-card sm:size-20";
  return (
    <span
      className={cn(
        "block shrink-0 rounded-full p-0.5",
        // The flame ring frames a real identity; while loading it stays
        // a quiet neutral so the placeholder doesn't read as content.
        isLoaded ? "brand-surface" : "bg-muted",
      )}
    >
      {!isLoaded ? (
        <span
          aria-hidden
          className={cn(inner, "block animate-pulse bg-muted")}
        />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={cn(inner, "block object-cover")} />
      ) : (
        <span
          aria-hidden
          className={cn(
            inner,
            "flex items-center justify-center bg-muted text-muted-foreground",
          )}
        >
          <UserIcon className="size-6 sm:size-7" strokeWidth={1.5} aria-hidden />
        </span>
      )}
    </span>
  );
}
