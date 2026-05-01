import { Select, Slider, Toggle } from "./controls";
import type { Setting } from "./data";
import { Preview } from "./previews";

/** A single setting row: label + description on the left, control on the
 *  right, and (when the setting has a visual effect) a small live-style
 *  preview underneath. */
export function SettingCard({ setting }: { setting: Setting }) {
  return (
    <article className="border-b border-ft-line-soft py-5 last:border-b-0">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <h3 className="text-[12px] font-semibold tracking-[0.1em] text-ft-ink uppercase">
            {setting.label}
          </h3>
          {setting.desc ? (
            <p className="mt-1 text-[11px] leading-snug text-ft-dim-2">
              {setting.desc}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          <Control setting={setting} />
        </div>
      </header>

      {setting.preview ? (
        <div className="mt-4">
          <Preview kind={setting.preview} setting={setting} />
        </div>
      ) : null}
    </article>
  );
}

function Control({ setting }: { setting: Setting }) {
  switch (setting.type) {
    case "toggle":
      return <Toggle on={setting.value} />;
    case "select":
      return <Select value={setting.value} options={setting.options} />;
    case "slider":
      return (
        <Slider value={setting.value} min={setting.min} max={setting.max} />
      );
  }
}
