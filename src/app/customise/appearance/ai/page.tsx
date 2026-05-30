import { buildPageMetadata } from "@/server/seo";
import { AiCustomiser } from "./_components/ai-customiser";

export const metadata = buildPageMetadata({
  title: "Design with AI",
  description:
    "Describe a look in plain words and preview it on the real typing surface before applying it.",
  path: "/customise/appearance/ai",
  noIndex: true,
});

export default function AiCustomisePage() {
  return <AiCustomiser />;
}
