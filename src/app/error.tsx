"use client";

import { useEffect } from "react";
import { Logo } from "@/components/ft";
import { ErrorScreen } from "./_components/error-screen";

/** Route-level crash screen. Rendered standalone (logo only, no app
 *  chrome) because the error may have come from the chrome itself;
 *  re-rendering it here could throw again. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the console so you still get the trace in dev.
    // (Next.js also reports it to the server logs in production.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <header className="safe-pt flex h-16 shrink-0 items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex-1 px-4 sm:px-6">
        <ErrorScreen
          code="Oops"
          title="This page couldn't load"
          description="Something broke while loading it. Try again, or head back to practice."
          primary={{ label: "Try again", onClick: reset }}
          secondary={{ label: "Back to practice", href: "/" }}
          passage={{
            typed: "something",
            wrong: "broke",
            before: "on",
            after: " our end",
          }}
          footnote={
            error.digest ? (
              <>
                Reference:{" "}
                <span className="font-mono tabular-nums">{error.digest}</span>
              </>
            ) : null
          }
        />
      </main>
    </div>
  );
}
