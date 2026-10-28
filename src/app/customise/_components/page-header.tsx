"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SettingsGroup } from "./groups";
import { ImportExportMenu } from "./import-export";

/** Header for a settings group page (ui-law §12.7): the group name as
 *  the page's h1, one plain sentence, and three page-level actions —
 *  "Reset (N)" (only while something on this page is customised), the
 *  Import / export menu, and a link to the Design with AI studio.
 *
 *  On phones the actions collapse to icon buttons (§10.6) so the row
 *  never wraps. */
export function SettingsPageHeader({
  group,
  customizedCount = 0,
  onReset,
}: {
  group: SettingsGroup;
  customizedCount?: number;
  onReset?: () => void;
}) {
  const plural = customizedCount === 1 ? "setting" : "settings";
  return (
    <PageHeader
      title={group.name}
      description={group.description}
      className="sm:items-center"
      aside={
        <>
          {onReset && customizedCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              aria-label={`Reset ${customizedCount} customised ${plural}`}
              className="h-9 sm:h-8"
              confirm={{
                title: `Reset ${customizedCount} ${plural}?`,
                description: (
                  <p className="text-sm text-muted-foreground">
                    Everything you changed on the {group.name} page goes
                    back to its default. Other pages keep their settings.
                  </p>
                ),
                confirmLabel: "Reset",
                confirmVariant: "destructive",
              }}
            >
              <RotateCcw aria-hidden />
              Reset
              <span className="tabular-nums text-primary">
                ({customizedCount})
              </span>
            </Button>
          ) : null}
          <ImportExportMenu />
          <Link
            href="/customise/appearance/ai"
            aria-label="Design with AI"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "size-9 px-0 sm:h-8 sm:w-auto sm:px-3",
            )}
          >
            <Sparkles aria-hidden className="text-primary" />
            <span className="hidden sm:inline">Design with AI</span>
          </Link>
        </>
      }
    />
  );
}
