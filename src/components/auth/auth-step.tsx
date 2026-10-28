import type { ReactNode } from "react";

/** One step of an auth flow inside `<AuthShell>`'s card: the step's own
 *  h1 and one muted line, centred under the logo, then the step's form.
 *  Each step names what it asks for ("Check your email", "Reset your
 *  password"), so the heading never describes a different step. */
export function AuthStep({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-balance text-foreground sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </header>
      {children}
    </div>
  );
}

/** An email address inside step copy: emphasised, and allowed to wrap
 *  only when it can't fit on a line of its own. */
export function EmailText({ children }: { children: string }) {
  return <span className="font-medium text-foreground wrap-anywhere">{children}</span>;
}
