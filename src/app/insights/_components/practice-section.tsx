import Link from "next/link";
import type { ReactNode } from "react";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { PageSection, Surface } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import type { PracticeTargets } from "@/types/insights";
import { PRACTICE_DESCRIPTION, PRACTICE_METHOD, PRACTICE_TITLE } from "./insights-copy";
import {
  PAIR_HEADER,
  PAIRS_CAPTION,
  PAIRS_EMPTY,
  PAIRS_LOCKED,
  PAIRS_TITLE,
  PRACTISE_PAIRS,
  PRACTISE_WORDS,
  WORD_HEADER,
  WORDS_CAPTION,
  WORDS_EMPTY,
  WORDS_LOCKED,
  WORDS_NOTE,
  WORDS_TITLE,
} from "./labels-copy";
import { PatternTable } from "./pattern-table";

/** "Where it shows" (spec-40 §3.4): the letter pairs and the words that
 *  are slowest for you, ranked by the same careful extra time the drills
 *  use, so the bar, the figure, the order and the drill all agree. */
export function PracticeSection({ practice }: { practice: PracticeTargets }) {
  return (
    <PageSection id="patterns" title={PRACTICE_TITLE} description={PRACTICE_DESCRIPTION}>
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
        <ListCard
          title={PAIRS_TITLE}
          empty={PAIRS_EMPTY}
          table={
            practice.pairs.length > 0 ? (
              <PatternTable rows={practice.pairs} keyHeader={PAIR_HEADER} caption={PAIRS_CAPTION} />
            ) : null
          }
          footer={
            practice.weaknessReady ? (
              <PractiseLink href="/drills/weakness">{PRACTISE_PAIRS}</PractiseLink>
            ) : (
              <p className="text-sm text-muted-foreground">{PAIRS_LOCKED}</p>
            )
          }
        />
        <ListCard
          title={WORDS_TITLE}
          note={WORDS_NOTE}
          empty={WORDS_EMPTY}
          table={
            practice.words.length > 0 ? (
              <PatternTable rows={practice.words} keyHeader={WORD_HEADER} caption={WORDS_CAPTION} />
            ) : null
          }
          footer={
            practice.worstWordsReady ? (
              <PractiseLink href="/drills/worst-words">{PRACTISE_WORDS}</PractiseLink>
            ) : (
              <p className="text-sm text-muted-foreground">{WORDS_LOCKED}</p>
            )
          }
        />
      </div>
      <MethodDisclosure>
        {PRACTICE_METHOD.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </MethodDisclosure>
    </PageSection>
  );
}

function ListCard({
  title,
  note,
  empty,
  table,
  footer,
}: {
  title: string;
  note?: string;
  empty: string;
  table: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Surface className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      {table ?? <p className="text-sm text-muted-foreground">{empty}</p>}
      <div className="mt-auto">{footer}</div>
    </Surface>
  );
}

function PractiseLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={buttonVariants({ variant: "outline", className: "h-11 w-full sm:h-9 sm:w-auto" })}>
      {children}
    </Link>
  );
}
