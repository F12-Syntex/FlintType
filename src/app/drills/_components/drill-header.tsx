"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tag } from "@/components/ft";

/** Shared chrome for every drill page. A breadcrumb back-link sits at
 *  the very top, mirroring the customise sub-page back-link
 *  (`docs/ui-law.md` §12.5) so the user trains a single mental model
 *  for "leave this surface". The drill subtitle and title sit below.
 *
 *  The whole strip uses semantic tokens (border-border, bg-background,
 *  text-muted-foreground) so it inherits whatever theme the user has
 *  picked. It deliberately mirrors the customise breadcrumb spacing
 *  and tracking — the two surfaces are the only places in the app
 *  that ship a back-to-parent affordance, and they should look the
 *  same. */
export function DrillHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <header className="border-b border-border bg-background px-5 pt-6 pb-5 sm:px-12 sm:pt-7 lg:px-20">
      <Link
        href="/drills"
        className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} aria-hidden />
        Drills
      </Link>
      <div className="flex flex-col gap-1">
        <Tag>{subtitle}</Tag>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h1>
      </div>
    </header>
  );
}
