import { Tag } from "@/components/ft";

type InsightKind = "win" | "now" | "next";

export type HeadlineInsight = {
  kind: InsightKind;
  headline: string;
  detail: string;
};

const KIND_DOT: Record<InsightKind, string> = {
  // ft-ok stays — ui-law §2.3 keeps it until a `--success` var lands.
  // The other two map onto theme-aware tokens so they re-tint per palette.
  win: "border-ft-ok text-ft-ok",
  now: "border-muted-foreground text-muted-foreground",
  next: "border-primary text-primary",
};

const KIND_LABEL: Record<InsightKind, string> = {
  win: "WIN",
  now: "CURRENT",
  next: "NEXT",
};

function Insight({ kind, headline, detail }: HeadlineInsight) {
  return (
    <div className={`flex-1 border-l-2 pl-4.5 ${KIND_DOT[kind]}`}>
      <div className="mb-2 text-[10px] font-semibold tracking-[0.18em]">
        {KIND_LABEL[kind]}
      </div>
      <div className="mb-1.5 text-base leading-snug font-semibold text-foreground sm:text-[17px]">
        {headline}
      </div>
      <div className="text-xs leading-relaxed text-muted-foreground">{detail}</div>
    </div>
  );
}

export function Headline({
  hero,
  insights,
}: {
  /** Hero strapline rendered as the page-title h1. Two halves: the
   *  bold left-side claim and a muted continuation below. Both can be
   *  empty strings on cold start, in which case the right-side dash
   *  is suppressed. */
  hero: { highlight: string; lead: string; muted: string };
  /** 0–3 insights. Cold users get an empty array; the panel still
   *  renders the eyebrow + hero so the page never looks broken. */
  insights: readonly HeadlineInsight[];
}) {
  return (
    <section className="border-b border-foreground/10 px-5 pt-12 pb-9 sm:px-16">
      <div className="mb-5 flex items-center gap-3.5">
        <span className="inline-block h-px w-7 bg-primary" aria-hidden />
        <Tag>YOUR HISTORY · LAST 90 DAYS</Tag>
      </div>
      <h1 className="m-0 max-w-5xl text-3xl leading-tight font-extrabold tracking-[-0.03em] sm:text-4xl lg:text-[56px]">
        {hero.lead}
        {hero.highlight ? (
          <>
            {" "}
            <span className="text-primary">{hero.highlight}</span>
          </>
        ) : null}
        {hero.muted ? (
          <>
            {hero.lead || hero.highlight ? <br /> : null}
            <span className="text-muted-foreground">{hero.muted}</span>
          </>
        ) : null}
      </h1>
      {insights.length > 0 ? (
        <div className="mt-9 flex flex-col gap-7 sm:flex-row sm:gap-14">
          {insights.map((i) => (
            <Insight key={i.kind} {...i} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
