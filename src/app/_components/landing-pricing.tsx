import { Tag } from "@/components/ft";

export function Pricing() {
  return (
    <section className="px-5 pb-20 sm:px-20 sm:pb-30">
      <div className="mb-10 flex flex-wrap items-baseline gap-4 sm:mb-14">
        <Tag>§ 04</Tag>
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-[44px]">
          Pricing.
        </h2>
        <span className="ml-auto text-xs text-ft-dim">
          nothing important is paywalled, ever
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="border border-ft-ink p-8 sm:p-10">
          <div className="mb-6 flex justify-between">
            <span className="text-sm font-semibold">FREE</span>
            <span className="text-3xl font-bold tracking-[-0.04em] tabular-nums sm:text-4xl">
              $0
            </span>
          </div>
          <p className="mb-6 text-[13px] leading-relaxed text-ft-dim-2">
            Everything. Forever. Tests, drills, races, full diagnosis, full
            history, leaderboards.
          </p>
          <ul className="m-0 list-none p-0 text-[13px] leading-loose">
            <li>— Unlimited tests, all modes</li>
            <li>— Full per-keystroke analysis</li>
            <li>— Adaptive drills</li>
            <li>— Real-time races</li>
            <li>— 30 days of history</li>
          </ul>
        </div>
        <div className="border border-ft-ember bg-ft-ink p-8 text-ft-paper sm:p-10 lg:border-l-0">
          <div className="mb-6 flex justify-between">
            <span className="text-sm font-semibold text-ft-ember">SUPPORTER</span>
            <span className="text-3xl font-bold tracking-[-0.04em] tabular-nums sm:text-4xl">
              $4
              <span className="text-sm font-normal text-[#9C978A]">/mo</span>
            </span>
          </div>
          <p className="mb-6 text-[13px] leading-relaxed text-[#B5AF9F]">
            Tip jar with perks. You&apos;re paying because you like what
            we&apos;re doing — not to unlock anything that matters.
          </p>
          <ul className="m-0 list-none p-0 text-[13px] leading-loose">
            <li>— Leaderboard badge</li>
            <li>— Theme customisation</li>
            <li>— Unlimited history</li>
            <li>— Custom keymaps + presets</li>
            <li>— A warm fuzzy feeling</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
