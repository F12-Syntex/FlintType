"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { legacyAppearanceHref } from "../_components/groups";

/** /customise/appearance used to be one very long page. Its sections
 *  now live on task-based pages; this keeps old links (and their
 *  `#section` anchors) working by forwarding to the new home. */
export default function AppearanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(legacyAppearanceHref(window.location.hash));
  }, [router]);
  return (
    <p className="pt-8 text-sm text-muted-foreground" aria-live="polite">
      Opening settings…
    </p>
  );
}
