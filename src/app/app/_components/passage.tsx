import { cn } from "@/lib/utils";

export function Passage({
  words,
  active,
  cursorWord,
  cursorChar,
}: {
  words: string[];
  active: boolean;
  cursorWord: number;
  cursorChar: number;
}) {
  const errorWords = active ? new Set([4, 11, 18]) : new Set<number>();
  const sparkWords = new Set([14, 19]);

  return (
    <div className="text-xl leading-[1.7] font-normal text-ft-dim sm:text-2xl lg:text-[26px]">
      {words.map((word, wi) => {
        if (active && wi < cursorWord) {
          const isErr = errorWords.has(wi);
          return (
            <span
              key={wi}
              className={cn(
                "text-ft-ink",
                isErr && "text-ft-ember underline decoration-1 underline-offset-[6px]",
              )}
            >
              {word}{" "}
            </span>
          );
        }
        if (active && wi === cursorWord) {
          return (
            <span key={wi} className="relative">
              <span className="text-ft-ink">{word.slice(0, cursorChar)}</span>
              <span
                className="mx-px inline-block h-[1.1em] w-0.5 align-text-bottom bg-ft-ember"
                style={{ animation: "ft-blink 1s steps(2) infinite" }}
                aria-hidden
              />
              <span className="text-ft-dim">{word.slice(cursorChar)}</span>{" "}
            </span>
          );
        }
        if (!active && wi === 0) {
          return (
            <span key={wi} className="relative">
              <span
                className="mx-px inline-block h-[1.1em] w-0.5 align-text-bottom bg-ft-ember"
                style={{ animation: "ft-blink 1s steps(2) infinite" }}
                aria-hidden
              />
              <span className="text-ft-dim">{word}</span>{" "}
            </span>
          );
        }
        return (
          <span
            key={wi}
            className={cn(active && sparkWords.has(wi) && "text-ft-ember-soft")}
          >
            {word}{" "}
          </span>
        );
      })}
    </div>
  );
}
