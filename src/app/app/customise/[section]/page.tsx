"use client";

import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SECTIONS } from "../_components/data";

/** A single settings section. Pure composition — every visible piece is a
 *  shadcn primitive (Card, Switch, Slider, Separator) or
 *  <SegmentedControl> from `@/components/ui`. State for every control on
 *  the page is held in one record keyed by setting id, so we call hooks
 *  unconditionally at the top once instead of needing a per-setting
 *  child component. */
export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const data = SECTIONS.find((s) => s.id === params.section);

  // Initialise every setting's value from the data table on first mount.
  // If the URL section is unknown, we still need to call this hook so
  // hooks-order stays stable; the not-found branch runs after.
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    if (data) for (const s of data.settings) init[s.id] = s.value;
    return init;
  });

  if (!data) notFound();

  const set = (id: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [id]: v }));

  return (
    <section>
      <header className="mb-6">
        <h2 className="text-xl font-bold tracking-tight">
          {data.name.charAt(0)}
          {data.name.slice(1).toLowerCase()}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.settings.length} options
        </p>
      </header>

      <Separator className="mb-6" />

      <div className="flex flex-col gap-3">
        {data.settings.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
              {s.desc ? (
                <CardDescription>{s.desc}</CardDescription>
              ) : null}
              <CardAction>
                {s.type === "toggle" ? (
                  <Switch
                    checked={values[s.id] as boolean}
                    onCheckedChange={(v) => set(s.id, v)}
                  />
                ) : null}
                {s.type === "select" ? (
                  <SegmentedControl
                    value={values[s.id] as string}
                    onValueChange={(v) => set(s.id, v)}
                    options={s.options}
                    size="sm"
                    ariaLabel={s.label}
                  />
                ) : null}
                {s.type === "slider" ? (
                  <div className="flex w-44 items-center gap-3">
                    <Slider
                      value={[values[s.id] as number]}
                      min={s.min}
                      max={s.max}
                      onValueChange={(v) => {
                        if (Array.isArray(v) && typeof v[0] === "number") {
                          set(s.id, v[0]);
                        }
                      }}
                      className="flex-1"
                    />
                    <span className="min-w-4 text-right text-xs tabular-nums">
                      {values[s.id] as number}
                    </span>
                  </div>
                ) : null}
              </CardAction>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
