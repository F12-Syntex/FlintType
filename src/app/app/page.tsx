import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { TypingSurface } from "./_components/typing-surface";

export const metadata = buildPageMetadata({
  title: "Practice",
  description:
    "flinttype typing practice — distraction-free passage with peripheral live signal.",
  path: "/app",
  noIndex: true,
});

export default function PracticePage() {
  return (
    <AppChrome>
      <TypingSurface />
    </AppChrome>
  );
}
