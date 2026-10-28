import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Typing settings",
  description:
    "Choose the font, the caret and how the text behaves while you type, including tape mode and how your mistakes are marked.",
  path: "/customise/typing",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
