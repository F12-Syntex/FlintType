import { ChangeRow } from "@/components/analysis/change-row";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { PageSection, Surface } from "@/components/page-shell";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import type { Change } from "@/types/insights";
import { betterIsLower, CHANGES_EMPTY, changeDetail, changeTitle } from "./change-copy";
import { DashedNote } from "./dashed-note";
import { CHANGES_METHOD, CHANGES_TITLE, changesDescription } from "./insights-copy";

/** "What changed" (spec-40 §3.3.2): at most three changes that passed the
 *  noise gate, improvements first. Most weeks show the empty card, and
 *  that is the honest answer. */
export function ChangesSection({
  items,
  earlierN,
  unit,
  after,
}: {
  items: Change[];
  earlierN: number;
  unit: TypingSpeedUnit;
  after?: string;
}) {
  return (
    <PageSection id="changes" title={CHANGES_TITLE} description={changesDescription(earlierN)}>
      {items.length === 0 ? (
        <DashedNote>{CHANGES_EMPTY}</DashedNote>
      ) : (
        <Surface as="ul" className="divide-y divide-border/70">
          {items.map((c) => (
            <li key={`${c.kind}-${c.key ?? ""}`}>
              <ChangeRow
                direction={c.direction}
                title={changeTitle(c)}
                detail={changeDetail(c, unit, earlierN)}
                before={c.before}
                after={c.after}
                betterIsLower={betterIsLower(c.kind)}
              />
            </li>
          ))}
        </Surface>
      )}
      {after ? <p className="text-sm text-muted-foreground">{after}</p> : null}
      <MethodDisclosure>
        {CHANGES_METHOD.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </MethodDisclosure>
    </PageSection>
  );
}
