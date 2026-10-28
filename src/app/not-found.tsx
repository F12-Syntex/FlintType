import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "./_components/app-chrome";
import { ErrorScreen } from "./_components/error-screen";

export const metadata = buildPageMetadata({
  title: "404 — passage not found",
  description: "The route you tried doesn't exist on flinttype.",
  path: "/404",
  noIndex: true,
});

/** 404 inside the normal app frame, so the top bar and footer are there
 *  to navigate away. Primary action goes back to practice; the
 *  secondary opens the command palette to search every page. */
export default function NotFound() {
  return (
    <AppChrome>
      <ErrorScreen
        code="404"
        title="This page doesn't exist"
        description="The link may be old or mistyped. Head back to practice, or search for the page you were after."
        primary={{ label: "Back to practice", href: "/" }}
        passage={{
          typed: "the page you",
          wrong: "requested",
          before: "doesn't",
          after: " exist",
        }}
      />
    </AppChrome>
  );
}
