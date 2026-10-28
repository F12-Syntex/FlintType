"use client";

import { usePathname } from "next/navigation";
import { signInHref } from "./sign-in-href";

/** A sign-in link that comes back to the current page. */
export function useSignInHref(): string {
  return signInHref(usePathname() ?? "/");
}
