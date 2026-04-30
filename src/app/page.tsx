import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FtButton, Logo, Tag, TopBar, type NavItem } from "@/components/ft";
import { GITHUB_URL } from "@/lib/version";
import { buildPageMetadata } from "@/server/seo";
import { ComparisonTable } from "./_components/landing-comparison";
import { DemoPanel } from "./_components/landing-demo";
import { Hero } from "./_components/landing-hero";
import { LoopGrid } from "./_components/landing-loop";
import { Pricing } from "./_components/landing-pricing";

export const metadata = buildPageMetadata({
  title: "Type faster. Understand why you're stuck.",
  description:
    "flinttype — open-source typing trainer that diagnoses the specific letter pairs, words, and bursts holding you back, then drills you out of them.",
  path: "/",
});

const NAV: NavItem[] = [
  { href: "#why", label: "WHY" },
  { href: "#how", label: "HOW IT WORKS" },
  { href: "#races", label: "RACES" },
  { href: "#changelog", label: "CHANGELOG" },
  { href: GITHUB_URL, label: "GITHUB" },
];

function SignInButtons({ stacked = false }: { stacked?: boolean }) {
  return (
    <>
      <Link href="/sign-in" className={stacked ? "w-full" : ""}>
        <FtButton variant="ghost" size="sm" className={stacked ? "w-full" : ""}>
          SIGN IN
        </FtButton>
      </Link>
      <Link href="/sign-up" className={stacked ? "w-full" : ""}>
        <FtButton variant="ember" size="sm" className={stacked ? "w-full" : ""}>
          START TYPING →
        </FtButton>
      </Link>
    </>
  );
}

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect("/app");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar
        nav={NAV}
        right={
          <div className="hidden gap-2 sm:flex">
            <SignInButtons />
          </div>
        }
        drawerExtras={
          <div className="flex flex-col gap-3">
            <SignInButtons stacked />
          </div>
        }
      />

      <Hero />
      <DemoPanel />
      <LoopGrid />
      <ComparisonTable />
      <Pricing />

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-foreground px-5 py-8 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:px-20">
        <Logo size="sm" />
        <span className="hidden text-foreground sm:inline">
          FLINTTYPE © MMXXVI
        </span>
        <div className="hidden gap-7 md:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GITHUB
          </a>
          <span>DISCORD</span>
          <span>CHANGELOG</span>
          <span>STATUS</span>
          <span>PRIVACY</span>
        </div>
        <Tag>STRIKE · SPARK · SHARPEN</Tag>
      </footer>
    </div>
  );
}
