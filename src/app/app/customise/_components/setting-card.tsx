"use client";

import { useState } from "react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type {
  SelectSetting,
  Setting,
  SliderSetting,
  ToggleSetting,
} from "./data";
import { Preview } from "./previews";

/** A single setting row. Discriminates on setting.type and renders the
 *  matching shadcn primitive — Switch / ToggleGroup / Slider — inside a
 *  shadcn Card. Holds the user's current value as local state so the
 *  control actually toggles in the UI and the per-setting preview tracks
 *  the change live. Persistence will land when the settings store is
 *  wired through. */
export function SettingCard({ setting }: { setting: Setting }) {
  switch (setting.type) {
    case "toggle":
      return <ToggleCard setting={setting} />;
    case "select":
      return <SelectCard setting={setting} />;
    case "slider":
      return <SliderCard setting={setting} />;
  }
}

function Shell({
  setting,
  current,
  control,
}: {
  setting: Setting;
  current: Setting;
  control: React.ReactNode;
}) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="text-sm font-semibold tracking-wide uppercase">
          {setting.label}
        </CardTitle>
        {setting.desc ? (
          <CardDescription>{setting.desc}</CardDescription>
        ) : null}
        <CardAction>{control}</CardAction>
      </CardHeader>
      {setting.preview ? (
        <CardContent>
          <Preview kind={setting.preview} setting={current} />
        </CardContent>
      ) : null}
    </Card>
  );
}

function ToggleCard({ setting }: { setting: ToggleSetting }) {
  const [checked, setChecked] = useState(setting.value);
  return (
    <Shell
      setting={setting}
      current={{ ...setting, value: checked }}
      control={<Switch checked={checked} onCheckedChange={setChecked} />}
    />
  );
}

function SelectCard({ setting }: { setting: SelectSetting }) {
  const [value, setValue] = useState(setting.value);
  return (
    <Shell
      setting={setting}
      current={{ ...setting, value }}
      control={
        <SegmentedControl
          value={value}
          onValueChange={setValue}
          options={setting.options}
          size="sm"
          ariaLabel={setting.label}
        />
      }
    />
  );
}

function SliderCard({ setting }: { setting: SliderSetting }) {
  const [value, setValue] = useState(setting.value);
  return (
    <Shell
      setting={setting}
      current={{ ...setting, value }}
      control={
        <div className="flex w-44 items-center gap-3">
          <Slider
            value={[value]}
            min={setting.min}
            max={setting.max}
            onValueChange={(v) => {
              if (Array.isArray(v) && typeof v[0] === "number") setValue(v[0]);
            }}
            className="flex-1"
          />
          <span className="min-w-4 text-right text-[11px] tabular-nums text-ft-ink">
            {value}
          </span>
        </div>
      }
    />
  );
}
