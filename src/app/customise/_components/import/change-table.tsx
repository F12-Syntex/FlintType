import type { ImportItem } from "@/types/settings-import";
import { originLine, otherSettings, TABLE_HEADERS, tableCaption } from "./review-copy";

function Swatch({ colour }: { colour: string }) {
  return (
    <span
      aria-hidden
      className="mt-1 size-3 shrink-0 rounded-full outline outline-1 -outline-offset-1 outline-foreground/15"
      style={{ backgroundColor: colour }}
    />
  );
}

function Value({ text, swatch }: { text: string; swatch?: string }) {
  if (!swatch) return <>{text}</>;
  return (
    <span className="flex items-start gap-1.5">
      <Swatch colour={swatch} />
      {text}
    </span>
  );
}

/** One group's changes: the setting, its value now, and its value after
 *  the import. For a MonkeyType file, a muted line under the new value
 *  says where it came from when that adds something ("From Minimal"). */
export function ChangeTable({
  groupName,
  items,
}: {
  groupName: string;
  items: readonly ImportItem[];
}) {
  const [setting, now, after] = TABLE_HEADERS;
  const shown = items.filter((i) => !i.hidden);
  const hidden = items.length - shown.length;
  return (
    <table className="w-full table-fixed text-sm">
      <caption className="sr-only">{tableCaption(groupName)}</caption>
      <colgroup>
        <col className="w-[34%]" />
        <col className="w-[32%]" />
        <col className="w-[34%]" />
      </colgroup>
      <thead>
        <tr className="text-left text-xs text-muted-foreground">
          <th scope="col" className="pr-3 pb-1.5 font-medium">{setting}</th>
          <th scope="col" className="pr-3 pb-1.5 font-medium">{now}</th>
          <th scope="col" className="pb-1.5 font-medium">{after}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/50">
        {shown.map((item) => {
          const origin = originLine(item);
          return (
            <tr key={item.id}>
              <th scope="row" className="py-2 pr-3 text-left align-top font-normal text-foreground [overflow-wrap:break-word]">
                {item.label}
              </th>
              <td className="py-2 pr-3 align-top text-muted-foreground tabular-nums [overflow-wrap:break-word]">
                <Value text={item.now} swatch={item.nowSwatch} />
              </td>
              <td className="py-2 align-top font-medium text-foreground tabular-nums [overflow-wrap:break-word]">
                <Value text={item.to} swatch={item.swatch} />
                {origin ? (
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{origin}</span>
                ) : null}
              </td>
            </tr>
          );
        })}
        {hidden > 0 ? (
          <tr>
            <td colSpan={3} className="py-2 text-muted-foreground">{otherSettings(hidden)}</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
