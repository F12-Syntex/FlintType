import { FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportSource } from "@/types/settings-import";
import { chooseIntro, COPY, pasteLabel } from "./import-copy";

/** Choose: paste the settings, choose the saved file, or drop it on the
 *  dialog (fine pointers). MonkeyType copies its export to the
 *  clipboard, so pasting is the shortest way in. */
export function ChooseStage({
  source,
  text,
  onText,
  onSubmit,
  onChooseFile,
}: {
  source: ImportSource;
  text: string;
  onText: (text: string) => void;
  onSubmit: () => void;
  onChooseFile: () => void;
}) {
  const [first, second] = chooseIntro(source);
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-1 text-sm leading-relaxed text-muted-foreground">
        <p>{first}</p>
        <p>{second}</p>
      </div>
      <label htmlFor="settings-import-text" className="sr-only">
        {pasteLabel(source)}
      </label>
      <textarea
        id="settings-import-text"
        rows={6}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        value={text}
        placeholder={COPY.pastePlaceholder}
        onChange={(e) => onText(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && text.trim()) {
            e.preventDefault();
            onSubmit();
          }
        }}
        className="mt-4 block min-h-36 w-full resize-none rounded-xl border border-input bg-card px-3 py-2.5 font-mono text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 sm:text-sm"
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Button type="button" variant="outline" onClick={onChooseFile} className="h-11 w-full sm:h-9 sm:w-auto">
          <FileUp aria-hidden />
          {COPY.chooseFile}
        </Button>
        <span className="hidden text-sm text-muted-foreground [@media(pointer:fine)]:sm:block">
          {COPY.dropHint}
        </span>
      </div>
    </div>
  );
}
