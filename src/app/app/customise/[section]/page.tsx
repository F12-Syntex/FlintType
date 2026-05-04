"use client";

import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OptionSwitch } from "@/components/ui/option-switch";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SECTIONS } from "../_components/data";
import { SettingsPageHeader } from "../_components/page-header";

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const data = SECTIONS.find((s) => s.id === params.section);

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    if (data) for (const s of data.settings) init[s.id] = s.value;
    return init;
  });

  if (!data) notFound();

  const set = (id: string, v: unknown) =>
    setValues((prev) => ({ ...prev, [id]: v }));

  return (
    <section className="text-foreground">
      <SettingsPageHeader
        title={titleCase(data.name)}
        optionsCount={data.settings.length}
      />

      <div className="flex flex-col gap-3">
        {data.settings.map((s) => (
          <Card key={s.id} className="rounded-md shadow-sm ring-border min-h-16">
            <CardHeader className="@container/card-header">
              <CardTitle className="text-sm font-semibold">
                {s.label}
              </CardTitle>
              {s.desc ? (
                <CardDescription className="text-xs sm:text-sm">
                  {s.desc}
                </CardDescription>
              ) : null}
              <CardAction className="col-span-2 row-start-3 mt-2 justify-self-start @[22rem]/card-header:col-span-1 @[22rem]/card-header:col-start-2 @[22rem]/card-header:row-span-2 @[22rem]/card-header:row-start-1 @[22rem]/card-header:mt-0 @[22rem]/card-header:justify-self-end">
                {s.type === "toggle" ? (
                  <Switch
                    checked={values[s.id] as boolean}
                    onCheckedChange={(v) => set(s.id, v)}
                  />
                ) : null}
                {s.type === "select" ? (
                  <OptionSwitch
                    name={s.id}
                    size="small"
                    value={values[s.id] as string}
                    onValueChange={(v) => set(s.id, v)}
                  >
                    {s.options.map((o) => (
                      <OptionSwitch.Control key={o} label={o} value={o} />
                    ))}
                  </OptionSwitch>
                ) : null}
                {s.type === "slider" ? (
                  <div className="flex w-full items-center gap-3 sm:w-44">
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
                    <Badge variant="outline" className="px-2 tabular-nums">
                      {values[s.id] as number}
                    </Badge>
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
