import { notFound } from "next/navigation";
import { Tag } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { SECTIONS } from "../_components/data";
import { SettingCard } from "../_components/setting-card";

/** Pre-render one page per known section at build time. */
export function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const data = SECTIONS.find((s) => s.id === section);
  const label = data ? data.name.toLowerCase() : "settings";
  return buildPageMetadata({
    title: `${data?.name ?? "Settings"} · Settings`,
    description: `flinttype ${label} settings · ${data?.settings.length ?? 0} options with live previews`,
    path: `/app/customise/${section}`,
    noIndex: true,
  });
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const data = SECTIONS.find((s) => s.id === section);
  if (!data) notFound();

  return (
    <section>
      {/* Section header — distinct row above the cards. The thin ember
          stripe + Tag + count read as a "page within a page" label and
          give the eye somewhere to land between the global header and
          the first card. */}
      <header className="mb-6 border-b border-ft-line-soft pb-4">
        <div className="mb-2 flex items-center gap-3">
          <span
            aria-hidden
            className="inline-block h-px w-5 bg-ft-ember"
          />
          <Tag>SECTION</Tag>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-ft-ink sm:text-2xl">
            {data.name.charAt(0)}
            {data.name.slice(1).toLowerCase()}
          </h2>
          <span className="text-[10px] tracking-[0.14em] text-ft-dim uppercase">
            {data.settings.length} options
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {data.settings.map((s) => (
          <SettingCard key={s.id} setting={s} />
        ))}
      </div>
    </section>
  );
}
