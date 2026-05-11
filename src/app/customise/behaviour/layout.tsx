import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Behaviour",
  description:
    "Tune how flinttype reacts while you type — restart shortcuts, live signal, error handling, and word-list shape. Every change applies on the next keystroke.",
  path: "/customise/behaviour",
  noIndex: true,
});

export default function BehaviourLayout({ children }: { children: ReactNode }) {
  return children;
}
