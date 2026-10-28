"use client";

import { Keyboard } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The share page's two next steps: take the test (the page's one
 *  filled orange action) and the runner's profile (outline). Left
 *  aligned with the header and the card's left edge. Client
 *  module only because `buttonVariants` lives in a client file. */
export function ShareActions({ profileHref }: { profileHref: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
      <Link
        href="/"
        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
      >
        <Keyboard aria-hidden />
        Take the test
      </Link>
      <Link
        href={profileHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          "w-full sm:w-auto",
        )}
      >
        View profile
      </Link>
    </div>
  );
}
