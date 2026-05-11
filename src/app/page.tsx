import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { TypingSurface } from "./_components/typing-surface";

export const metadata = buildPageMetadata({
  title: "flinttype",
  description:
    "flinttype — open-source typing trainer that diagnoses the specific letter pairs, words, and bursts holding you back, then drills you out of them.",
  path: "/",
});

export default function PracticePage() {
  return (
    <AppChrome compact>
      <TypingSurface />
    </AppChrome>
  );
}
