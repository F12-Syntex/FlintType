import { buildPageMetadata } from "@/server/seo";
import { DesignStudio } from "./_components/design-studio";

export const metadata = buildPageMetadata({
  title: "Design with AI",
  description:
    "Preview an AI-generated look across six surfaces of the app before applying it to your settings.",
  path: "/customise/appearance/ai",
  noIndex: true,
});

export default function DesignWithAiPage() {
  return <DesignStudio />;
}
