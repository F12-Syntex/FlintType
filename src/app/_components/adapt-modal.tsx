"use client";

import Link from "next/link";
import { Lock, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HandLayoutEditor } from "./keyboard/hands";

/** Centred modal explaining adaptive practice and hosting the live
 *  hand-layout editor. Backdrop click and Esc close; clicks inside the
 *  panel never close.
 *
 *  Deliberately a portal-backed modal rather than a Radix Popover or
 *  Dialog: the hand-layout editor's drag avatar is `position: fixed`,
 *  and a transformed ancestor (Popover/Dialog positioning) would become
 *  its containing block and throw the avatar off-cursor. Its drag/click
 *  interactions also need to coexist without outside-click dismissal. */
export function AdaptModal({
  open,
  onClose,
  adaptOn,
  requiresSignIn,
}: {
  open: boolean;
  onClose: () => void;
  /** Whether adaptive practice is currently on. Shown as a status chip
   *  in the header; the actual flip happens on the mode bar's toggle. */
  adaptOn: boolean;
  /** Anonymous viewer: adaptive practice is locked behind an account.
   *  The header swaps the status chip for a sign-in action. */
  requiresSignIn: boolean;
}) {
  // Body scroll lock + Esc dismissal while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Only ever open after a user action, so document.body exists; the
  // server render (open = false) returns null.
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adapt-modal-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />
      <div
        className="relative flex max-h-[90dvh] w-[min(48rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-float"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2
              id="adapt-modal-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Adaptive practice
            </h2>
            <p className="text-sm text-muted-foreground">
              Passages lean toward the letters and pairs slowing you down.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {requiresSignIn ? (
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}
              >
                <Lock aria-hidden /> Sign in to enable
              </Link>
            ) : (
              <span
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-pill border px-3 text-xs font-medium",
                  adaptOn
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 rounded-full",
                    adaptOn ? "bg-primary" : "bg-muted-foreground/40",
                  )}
                />
                {adaptOn ? "On" : "Off"}
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close"
            >
              <X />
            </Button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {requiresSignIn ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/[0.06] px-3 py-2.5 text-sm leading-relaxed text-foreground">
              <Lock size={14} aria-hidden className="mt-1 shrink-0 text-primary" />
              <span>
                Adaptive practice keeps a private model of your timings, so
                it needs an account.{" "}
                <Link
                  href="/sign-in"
                  className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                >
                  Sign in
                </Link>{" "}
                or{" "}
                <Link
                  href="/sign-up"
                  className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                >
                  create an account
                </Link>{" "}
                to turn it on.
              </span>
            </div>
          ) : null}
          <div className="mb-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every keystroke timing feeds three models:{" "}
              <span className="text-foreground">bigrams</span> and{" "}
              <span className="text-foreground">trigrams</span> for the pairs
              and triplets you actually type, plus{" "}
              <span className="text-foreground">motor features</span> from the
              hand layout below: same-finger transitions, cross-hand jumps and
              row jumps.
            </p>
            <p>
              Each pattern&apos;s running mean is compared against your own
              baseline. Where you&apos;ve fallen behind scores as weakness,
              weighted by how many samples back it up.
            </p>
            <p>
              New passages sample from a{" "}
              <span className="text-foreground">challenge band</span>{" "}just
              above your current speed, never so far that you stall, with a
              recency penalty so words don&apos;t repeat and a fatigue damper
              when recent sessions show you slowing.
            </p>
            <p className="text-xs">
              Adaptive practice runs on desktop only. Phones always behave as
              if it&apos;s off.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <HandLayoutEditor mode="static" />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
