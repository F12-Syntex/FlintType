"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useSyncExternalStore } from "react";
import { Kbd } from "@/components/ft";
import { Surface } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { commandKeyLabel, openCommandPalette } from "@/lib/command-palette/open";
import { cn } from "@/lib/utils";

type PrimaryAction =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

/** The 404 and crash screens: a big flame-gradient code, a plain h1,
 *  one orange primary action and a quiet secondary, beside a frozen
 *  "run" card that shows the error as a typing passage. Theme-aware
 *  (semantic tokens only) so it reads right in light, dark and every
 *  palette. The horizontal gutter comes from the caller. */
export function ErrorScreen({
  code,
  title,
  description,
  primary,
  secondary,
  passage,
  footnote,
}: {
  /** The big flame-gradient label ("404", "Oops"). Decorative: the h1
   *  carries the meaning for screen readers. */
  code: string;
  title: string;
  description: ReactNode;
  primary: PrimaryAction;
  /** Defaults to "Search pages", which opens the Cmd/Ctrl+K palette. */
  secondary?: { label: string; href: string };
  passage: { typed: string; wrong: string; before: string; after: string };
  footnote?: ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-6xl items-center gap-10 pt-10 pb-24 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24">
      <div className="flex flex-col items-start gap-5">
        <p
          aria-hidden
          className="brand-surface bg-clip-text pb-1 text-7xl leading-none font-extrabold tracking-tighter text-transparent sm:text-8xl"
        >
          {code}
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          <p className="max-w-md text-[15px] leading-7 text-muted-foreground sm:text-base">
            {description}
          </p>
        </div>
        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
          {"href" in primary ? (
            <Link href={primary.href} className={buttonVariants({ size: "lg" })}>
              {primary.label}
            </Link>
          ) : (
            <Button size="lg" onClick={primary.onClick}>
              {primary.label}
            </Button>
          )}
          {secondary ? (
            <Link
              href={secondary.href}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              {secondary.label}
            </Link>
          ) : (
            <SearchPagesButton />
          )}
        </div>
        {footnote ? (
          <p className="text-xs text-muted-foreground">{footnote}</p>
        ) : null}
      </div>

      <PassageCard passage={passage} />
    </div>
  );
}

/** A frozen typing passage that "breaks" on the error: typed text in
 *  ink, one wrong word in the error colour, a caret, then dim text. */
function PassageCard({
  passage,
}: {
  passage: { typed: string; wrong: string; before: string; after: string };
}) {
  return (
    <Surface className="flex flex-col gap-6 p-6 sm:p-8" as="div">
      <p
        aria-hidden
        className="text-xl leading-relaxed tracking-tight text-muted-foreground sm:text-2xl"
      >
        <span className="text-foreground">{passage.typed}</span>{" "}
        <span className="text-destructive underline decoration-destructive/60 decoration-2 underline-offset-[6px]">
          {passage.wrong}
        </span>{" "}
        <span className="text-foreground">{passage.before}</span>
        <span className="mx-px inline-block h-[1.05em] w-0.5 translate-y-[0.15em] rounded-full bg-primary motion-safe:animate-[ft-blink_1s_steps(2)_infinite]" />
        <span>{passage.after}</span>
      </p>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="size-1.5 rounded-full bg-muted-foreground/60" />
          Run stopped
        </span>
        <span className="tabular-nums">0:00</span>
      </div>
    </Surface>
  );
}

const noopSubscribe = () => () => {};

/** Opens the global command palette. The shortcut hint reads ⌘ on Apple
 *  platforms and Ctrl elsewhere, and hides on phones (no keyboard). */
export function SearchPagesButton({ className }: { className?: string }) {
  const modKey = useSyncExternalStore(
    noopSubscribe,
    () => commandKeyLabel(navigator.platform),
    () => "Ctrl",
  );
  return (
    <Button
      variant="outline"
      size="lg"
      onClick={openCommandPalette}
      className={cn("gap-2", className)}
    >
      <Search aria-hidden />
      Search pages
      <span className="ml-1 hidden items-center sm:inline-flex" aria-hidden>
        <Kbd>{modKey}</Kbd>
        <Kbd>K</Kbd>
      </span>
    </Button>
  );
}
