import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Keyboard settings",
  description:
    "Choose whether the on-screen keyboard shows under the text you type, then set its layout, key style, labels and size.",
  path: "/customise/keyboard",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
