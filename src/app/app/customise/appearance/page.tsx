"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  type ThemeVar,
  useThemeOverrides,
} from "@/lib/theme-customization";

type PreviewKind =
  | "page"
  | "card"
  | "text"
  | "primary"
  | "primary-foreground"
  | "accent"
  | "accent-foreground"
  | "muted"
  | "muted-foreground"
  | "border"
  | "input"
  | "ring";

type ColorSetting = {
  var: ThemeVar;
  label: string;
  desc: string;
  preview: PreviewKind;
};

const COLOR_SETTINGS: readonly ColorSetting[] = [
  {
    var: "--background",
    label: "Page background",
    desc: "The main canvas behind every screen",
    preview: "page",
  },
  {
    var: "--foreground",
    label: "Body text",
    desc: "Default text color for headlines and prose",
    preview: "text",
  },
  {
    var: "--card",
    label: "Card surface",
    desc: "Lifted panels — settings rows, popovers, the practice mode-bar",
    preview: "card",
  },
  {
    var: "--primary",
    label: "Primary accent",
    desc: "Active states, CTAs, the brand spark",
    preview: "primary",
  },
  {
    var: "--primary-foreground",
    label: "Primary text",
    desc: "Text rendered on top of the primary accent",
    preview: "primary-foreground",
  },
  {
    var: "--accent",
    label: "Highlight tint",
    desc: "Soft hover backgrounds and accent surfaces",
    preview: "accent",
  },
  {
    var: "--accent-foreground",
    label: "Highlight text",
    desc: "Text rendered on top of the highlight tint",
    preview: "accent-foreground",
  },
  {
    var: "--muted",
    label: "Muted surface",
    desc: "Sidebars and de-emphasized regions",
    preview: "muted",
  },
  {
    var: "--muted-foreground",
    label: "Muted text",
    desc: "Captions, eyebrow labels, secondary metadata",
    preview: "muted-foreground",
  },
  {
    var: "--border",
    label: "Border",
    desc: "Hairline dividers and outlines",
    preview: "border",
  },
  {
    var: "--input",
    label: "Input track",
    desc: "Form field backgrounds and toggle off-state tracks",
    preview: "input",
  },
  {
    var: "--ring",
    label: "Focus ring",
    desc: "The outline that wraps a focused element",
    preview: "ring",
  },
];

function Preview({ kind }: { kind: PreviewKind }) {
  switch (kind) {
    case "page":
      return (
        <div className="h-9 w-20 rounded-sm border border-border bg-background" />
      );
    case "card":
      return (
        <div className="h-9 w-20 rounded-sm border border-border bg-card shadow-sm" />
      );
    case "text":
      return (
        <span className="text-2xl font-bold tracking-tight text-foreground">
          Aa
        </span>
      );
    case "primary":
      return (
        <span className="inline-flex h-7 items-center rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground">
          Save
        </span>
      );
    case "primary-foreground":
      return (
        <span className="inline-flex h-7 items-center rounded-sm bg-primary px-3 text-xs font-semibold text-primary-foreground">
          Aa
        </span>
      );
    case "accent":
      return (
        <div className="h-9 w-20 rounded-sm border border-border bg-accent" />
      );
    case "accent-foreground":
      return (
        <span className="inline-flex h-7 items-center rounded-sm bg-accent px-3 text-xs font-semibold text-accent-foreground">
          Aa
        </span>
      );
    case "muted":
      return (
        <div className="h-9 w-20 rounded-sm border border-border bg-muted" />
      );
    case "muted-foreground":
      return (
        <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Caption
        </span>
      );
    case "border":
      return (
        <div className="h-9 w-20 rounded-sm border-2 border-border bg-card" />
      );
    case "input":
      return (
        <div className="flex h-9 w-20 items-center rounded-full bg-input p-1">
          <div className="h-6 w-6 rounded-full bg-primary-foreground shadow-sm ring-1 ring-foreground/15" />
        </div>
      );
    case "ring":
      return (
        <div className="h-9 w-20 rounded-sm bg-card ring-2 ring-ring" />
      );
  }
}

function ColorRow({
  setting,
  value,
  onChange,
  onClear,
}: {
  setting: ColorSetting;
  value: string | undefined;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  // <input type="color"> only accepts hex. If the user has stored a hex,
  // surface it. Otherwise default the picker to mid-grey — the actual
  // swatch reads the current resolved CSS variable so it stays accurate
  // regardless of underlying format (oklch in globals.css, hex from the
  // user, hsl, etc.).
  const inputValue =
    value && /^#[0-9a-f]{6}$/i.test(value) ? value : "#888888";
  const customized = value !== undefined;

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">{setting.label}</CardTitle>
        <CardDescription>{setting.desc}</CardDescription>
        <CardAction>
          <div className="flex items-center gap-3">
            <Preview kind={setting.preview} />
            <input
              type="color"
              aria-label={setting.label}
              value={inputValue}
              onChange={(e) => onChange(e.target.value)}
              className="h-8 w-12 cursor-pointer rounded-md border border-border bg-card"
            />
            {customized ? (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Reset
              </Button>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

function RadiusRow({
  value,
  onChange,
  onClear,
}: {
  value: string | undefined;
  onChange: (rem: number) => void;
  onClear: () => void;
}) {
  const numeric = value ? Number.parseFloat(value) : 0.5;

  return (
    <Card className="rounded-md shadow-sm ring-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Corner radius</CardTitle>
        <CardDescription>
          How rounded every surface, button, and card is
        </CardDescription>
        <CardAction>
          <div className="flex items-center gap-3">
            <div
              aria-hidden
              className="h-9 w-9 border-2 border-primary bg-card"
              style={{ borderRadius: `var(--radius)` }}
            />
            <Slider
              value={[numeric]}
              min={0}
              max={1.5}
              step={0.05}
              onValueChange={(v) => {
                if (Array.isArray(v) && typeof v[0] === "number") {
                  onChange(v[0]);
                }
              }}
              className="w-44"
            />
            <Badge variant="outline" className="px-2 tabular-nums">
              {numeric.toFixed(2)}rem
            </Badge>
            {value !== undefined ? (
              <Button variant="ghost" size="sm" onClick={onClear}>
                Reset
              </Button>
            ) : null}
          </div>
        </CardAction>
      </CardHeader>
    </Card>
  );
}

export default function AppearancePage() {
  const { overrides, setVar, clearVar, reset } = useThemeOverrides();
  const customizedCount = Object.keys(overrides).length;

  return (
    <section className="text-foreground">
      <header className="mb-6 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span aria-hidden className="inline-block h-px w-5 bg-primary" />
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Section
          </span>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-2 text-[0.65rem]">
              {COLOR_SETTINGS.length + 1} options
            </Badge>
            {customizedCount > 0 ? (
              <Badge className="px-2 text-[0.65rem]">
                {customizedCount} customized
              </Badge>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={customizedCount === 0}
            >
              Reset all
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {COLOR_SETTINGS.map((setting) => (
          <ColorRow
            key={setting.var}
            setting={setting}
            value={overrides[setting.var]}
            onChange={(v) => setVar(setting.var, v)}
            onClear={() => clearVar(setting.var)}
          />
        ))}

        <RadiusRow
          value={overrides["--radius"]}
          onChange={(rem) => setVar("--radius", `${rem}rem`)}
          onClear={() => clearVar("--radius")}
        />
      </div>
    </section>
  );
}
