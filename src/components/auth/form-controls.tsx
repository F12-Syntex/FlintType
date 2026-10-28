"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

/** Small pieces shared by the sign-in and sign-up forms: the "or"
 *  divider, the inline error line and the low-emphasis utility button. */

export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </div>
  );
}

export function ErrorLine({ message }: { message: string }) {
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

/** Low-emphasis action (back, resend, forgot password, use a code
 *  instead). One ghost button style so every utility action in the
 *  forms reads as the same affordance. */
export function UtilityButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-9 px-3 text-muted-foreground hover:text-foreground"
    >
      {children}
    </Button>
  );
}

/** The button row under a form: back on the left, the alternative on
 *  the right, wrapping on narrow screens. */
export function UtilityRow({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-3 flex flex-wrap items-center justify-between gap-1">
      {children}
    </div>
  );
}
