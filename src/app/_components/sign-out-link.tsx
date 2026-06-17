"use client";

import { useClerk } from "@clerk/nextjs";
import { clearUserScopedStorage } from "@/lib/sign-out-cleanup";
import { cn } from "@/lib/utils";

export function SignOutLink({ dark = false }: { dark?: boolean }) {
  const { signOut } = useClerk();
  return (
    <button
      type="button"
      onClick={() => {
        clearUserScopedStorage();
        void signOut({ redirectUrl: "/" });
      }}
      className={cn(
        "uppercase tracking-[0.16em] transition-colors",
        dark ? "hover:text-ft-paper" : "hover:text-foreground",
      )}
    >
      SIGN OUT
    </button>
  );
}
