import { FtButton, Tag } from "@/components/ft";
import { buildPageMetadata } from "@/server/seo";
import { AppChrome } from "../_components/app-chrome";
import { CustomiseNav } from "../_components/customise-nav";
import { CustomisePreview } from "../_components/customise-preview";
import { CustomiseSettings } from "../_components/customise-settings";

export const metadata = buildPageMetadata({
  title: "Customise",
  description: "flinttype settings — caret styles, themes, behaviour, keyboard visualisation, adaptive tuning.",
  path: "/app/customise",
  noIndex: true,
});

export default function CustomisePage() {
  return (
    <AppChrome>
      <header className="border-b border-ft-line-soft px-5 pt-7 pb-6 sm:px-14">
        <div className="mb-3.5 flex items-center gap-3.5">
          <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
          <Tag>CUSTOMISATION · 86 SETTINGS · CONFIG.TOML</Tag>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[44px]">
            Make it <span className="text-ft-ember">yours</span>.
          </h1>
          <div className="flex flex-wrap gap-2">
            <FtButton variant="ghost" size="sm">EXPORT CONFIG</FtButton>
            <FtButton variant="ghost" size="sm">IMPORT</FtButton>
            <FtButton variant="ghost" size="sm">RESET</FtButton>
            <FtButton variant="ember" size="sm">SAVE</FtButton>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_480px]">
        <CustomiseNav />
        <CustomisePreview />
        <CustomiseSettings />
      </div>
    </AppChrome>
  );
}
