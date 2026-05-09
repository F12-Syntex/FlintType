"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { findAppearanceSection } from "../_sections";

/** Page shell shared by every Appearance sub-page. Renders:
 *    1. A back-link breadcrumb to the Appearance overview
 *    2. The section title + one-line blurb pulled from _sections.ts
 *    3. A "Preview" card slot at the top (every sub-page has one)
 *    4. The body — rows the section already shipped, slotted in below.
 *
 *  The shell is what gives every sub-page its consistent rhythm. The
 *  preview is mandatory: a sub-page without a preview slot would
 *  silently fall back to a blank rectangle, which is worse than no
 *  card at all — better to enforce the contract here than rely on
 *  every page remembering. */
export function AppearanceSectionPage({
  id,
  preview,
  children,
}: {
  id: string;
  preview: ReactNode;
  children: ReactNode;
}) {
  const section = findAppearanceSection(id);
  if (!section) {
    return (
      <section className="text-foreground">
        <p className="text-sm text-muted-foreground">Unknown section.</p>
      </section>
    );
  }

  return (
    <section className="text-foreground">
      <div className="mb-4 hidden lg:block">
        <Link
          href="/app/customise/appearance"
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Appearance
        </Link>
      </div>

      <header className="mb-6 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs sm:font-medium">
            Appearance · {section.name}
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {section.name}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {section.blurb}
        </p>
      </header>

      <div className="mb-8">
        <div className="mb-3 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <h3 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-sm">
            Preview
          </h3>
        </div>
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {preview}
        </div>
      </div>

      {children}
    </section>
  );
}
