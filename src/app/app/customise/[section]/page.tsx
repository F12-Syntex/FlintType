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
      <div className="mb-5 flex items-baseline justify-between">
        <Tag tone="ink">{data.name}</Tag>
        <span className="text-[10px] tracking-[0.14em] text-ft-dim">
          {data.settings.length} OPTIONS
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {data.settings.map((s) => (
          <SettingCard key={s.id} setting={s} />
        ))}
      </div>
    </section>
  );
}
