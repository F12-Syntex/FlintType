export function RacePassage() {
  return (
    <div className="flex flex-1 flex-col border border-[#221F1A] bg-[#0A0A09] px-7 py-8 sm:px-9">
      <div className="mb-5 flex flex-wrap justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.18em] text-[#6E695F]">
          YOUR TRACK · POSITION 3 OF 4
        </span>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-[#9C978A]">
          <span className="text-ft-ember">WPM 92</span>
          <span>ACC 97.2%</span>
          <span>21/50 WORDS</span>
        </div>
      </div>
      <p className="m-0 text-lg leading-[1.7] text-[#5C5950] sm:text-xl lg:text-[22px]">
        <span className="text-ft-paper">
          the sharpest blade is the one that has been struck the most times
          against
        </span>{" "}
        <span className="text-ft-ember underline decoration-1 underline-offset-[6px]">
          another
        </span>{" "}
        <span className="relative">
          <span className="text-ft-paper">blade</span>
          <span
            className="mx-px inline-block h-[1.05em] w-0.5 align-text-bottom bg-ft-ember"
            style={{ animation: "ft-blink 1s steps(2) infinite" }}
            aria-hidden
          />
          <span>
            {" "}
            friction is what makes flint useful and so it is with the people you
            race so type until your fingers ache and the words become reflex
          </span>
        </span>
      </p>
    </div>
  );
}
