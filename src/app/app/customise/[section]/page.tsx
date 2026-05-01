"use client";

import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Tag } from "@/components/ft";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SECTIONS } from "../_components/data";

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
    <section>
      <header className="mb-6 border-b border-border pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span className="inline-block h-px w-5 bg-ft-ember" aria-hidden />
          <Tag>SECTION</Tag>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-bold tracking-tight">
            {data.name.charAt(0)}
            {data.name.slice(1).toLowerCase()}
          </h2>
          <Badge variant="secondary" className="px-2 text-[10px]">
            {data.settings.length} options
          </Badge>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {data.settings.map((s) => (
          <Card key={s.id} className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{s.label}</CardTitle>
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
