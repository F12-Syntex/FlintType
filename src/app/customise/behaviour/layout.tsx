import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Behaviour settings",
  description:
    "Tune how the typing test reacts to your keystrokes: mistakes, backspace, word lists, burst mode, key sounds and adaptive practice.",
  path: "/customise/behaviour",
  noIndex: true,
});

export default function BehaviourLayout({ children }: { children: ReactNode }) {
  return children;
}
