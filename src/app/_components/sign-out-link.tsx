"use client";

import { useClerk } from "@clerk/nextjs";
import { clearUserScopedStorage } from "@/lib/sign-out-cleanup";
import { cn } from "@/lib/utils";

export function SignOutLink({ className }: { className?: string }) {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => {
        clearUserScopedStorage();
        void signOut({ redirectUrl: "/" });
      }}
      className={cn("transition-colors hover:text-foreground", className)}
    >
      Sign out
    </button>
  );
}
