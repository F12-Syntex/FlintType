import type { ReactNode } from "react";
import { buildPageMetadata } from "@/server/seo";

export const metadata = buildPageMetadata({
  title: "Keyboard settings",
  description:
    "Style the on-screen practice keyboard, then choose the keymap layout, key labels and size shown under the text you type.",
  path: "/customise/keyboard",
  noIndex: true,
});

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
