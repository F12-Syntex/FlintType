"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FEATURED_THEMES: ReadonlyArray<{
  id: string;
  name: string;
  url: string;
  swatches: string[];
}> = [
  {
    id: "tweakcn-cmlhfpjhw",
    name: "Tweakcn · cmlhfpjhw",
    url: "https://tweakcn.com/r/themes/cmlhfpjhw000004l4f4ax3m7z",
    swatches: ["#0f172a", "#f97316", "#fafaf9", "#e7e5e4"],
  },
];

function buildCommand(url: string): string {
  return `yarn dlx shadcn@latest add ${url.trim()}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard blocked — fall through silently.
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="gap-2"
      aria-label="Copy install command"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function CommandLine({ command }: { command: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/60 p-2 pl-3">
      <span className="text-muted-foreground">$</span>
      <code className="flex-1 truncate font-mono text-xs text-foreground">
        {command}
      </code>
      <CopyButton text={command} />
    </div>
  );
}

function ThemeCard({
  name,
  url,
  swatches,
}: {
  name: string;
  url: string;
  swatches: string[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex">
            {swatches.map((c, i) => (
              <span
                key={c}
                aria-hidden
                className={cn(
                  "h-6 w-6 rounded-full border-2 border-card",
                  i > 0 && "-ml-2",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <span className="text-sm font-semibold">{name}</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          View <ExternalLink size={12} />
        </a>
      </div>
      <CommandLine command={buildCommand(url)} />
    </div>
  );
}

export function ThemesRow() {
  const [url, setUrl] = useState("");
  const cleanUrl = url.trim();
  const isUrl = /^https?:\/\//i.test(cleanUrl);

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Community themes</CardTitle>
        <CardDescription>
          Browse{" "}
          <a
            href="https://tweakcn.com"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            tweakcn.com
          </a>{" "}
          for shadcn-compatible themes. Paste a theme URL below, copy the
          install command, and run it in your project.
        </CardDescription>
      </CardHeader>

      <div className="flex flex-col gap-4 px-4 pb-4">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Featured
          </span>
          <div className="flex flex-col gap-2">
            {FEATURED_THEMES.map((t) => (
              <ThemeCard key={t.id} {...t} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            From a URL
          </span>
          <Input
            placeholder="https://tweakcn.com/r/themes/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
          {isUrl ? (
            <CommandLine command={buildCommand(cleanUrl)} />
          ) : cleanUrl.length > 0 ? (
            <span className="text-xs text-destructive">
              That doesn't look like a URL — it should start with http(s)://
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Paste a tweakcn (or any shadcn registry) URL to generate the
              install command.
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
