import { describe, expect, it } from "vitest";
import { type GrowthGeometry, growthPull, scrollLines, visibleLines } from "./passage-lines";

describe("visibleLines", () => {
  it("hugs text shorter than the reservation", () => {
    // A one-line quote with four lines reserved shows one line.
    expect(visibleLines(4, 1, null, false)).toBe(1);
    expect(visibleLines(4, 3, null, false)).toBe(3);
  });

  it("caps long text at the reservation", () => {
    expect(visibleLines(4, 9, null, false)).toBe(4);
    expect(visibleLines(3, 300, 3, true)).toBe(3);
  });

  it("always shows at least one line (empty passage, loading quote)", () => {
    expect(visibleLines(4, 0, null, false)).toBe(1);
    expect(visibleLines(0, 0, null, false)).toBe(1);
  });

  it("re-measures freely at rest, so a new passage gets its own height", () => {
    expect(visibleLines(4, 1, 3, false)).toBe(1);
    expect(visibleLines(4, 2, 1, false)).toBe(2);
  });

  it("only grows while a run is in progress", () => {
    // The first keystroke changes nothing.
    expect(visibleLines(4, 1, 1, true)).toBe(1);
    // An extra letter pushes the last word onto a new line: grow.
    expect(visibleLines(4, 2, 1, true)).toBe(2);
    // A wrap that resolves again doesn't pull the text back up.
    expect(visibleLines(4, 1, 2, true)).toBe(2);
    // Growth never passes the reservation.
    expect(visibleLines(4, 6, 3, true)).toBe(4);
  });

  it("follows a smaller reservation (window resized mid-run)", () => {
    expect(visibleLines(2, 3, 3, true)).toBe(2);
  });
});

describe("scrollLines", () => {
  it("never scrolls text that fits", () => {
    expect(scrollLines(4, 3, 4)).toBe(0);
    expect(scrollLines(4, 0, 1)).toBe(0);
  });

  it("keeps the caret on the middle line of longer text", () => {
    // cap 4 → trigger 2.
    expect(scrollLines(4, 1, 9)).toBe(0);
    expect(scrollLines(4, 2, 9)).toBe(0);
    expect(scrollLines(4, 3, 9)).toBe(1);
    expect(scrollLines(4, 6, 9)).toBe(4);
    // cap 3 → trigger 1.
    expect(scrollLines(3, 2, 9)).toBe(1);
  });

  it("keeps a lookahead line with two lines visible (FT-008)", () => {
    // cap 2 → trigger 0: the caret's line is always the top one.
    expect(scrollLines(2, 1, 5)).toBe(1);
    expect(scrollLines(2, 3, 5)).toBe(3);
  });

  it("follows the caret line by line with a single visible line", () => {
    expect(scrollLines(1, 0, 3)).toBe(0);
    expect(scrollLines(1, 2, 3)).toBe(2);
  });
});

/** Where the centred group's top sits for a given pull (the column
 *  centres the group's layout height: content minus the pull). */
function groupTop(g: GrowthGeometry, pull: number): number {
  const layout = g.above + g.lines * g.lineHeight + g.credit - pull;
  return (g.outer - layout) / 2;
}

describe("growthPull", () => {
  // 1440x900, Words 10: a 475px column, 60px readouts, 84px lines.
  const words: GrowthGeometry = {
    outer: 475,
    above: 60,
    credit: 0,
    lineHeight: 84,
    restLines: 1,
    lines: 1,
  };

  it("is 0 while the text keeps its rest height", () => {
    expect(growthPull(words)).toBe(0);
    // Fewer lines than at rest (a resize) never pulls either.
    expect(growthPull({ ...words, restLines: 2, lines: 1 })).toBe(0);
  });

  it("pulls by the growth, so a line added mid-run never moves the group", () => {
    const grown = { ...words, lines: 2 };
    const pull = growthPull(grown);
    expect(pull).toBe(84);
    // The group's top (readouts and the first line) stays where it was.
    expect(groupTop(grown, pull)).toBe(groupTop(words, 0));
  });

  it("keeps a quote's credit under the text and the top fixed", () => {
    const quote = { ...words, credit: 44, restLines: 2, lines: 2 };
    const grown = { ...quote, lines: 3 };
    const pull = growthPull(grown);
    expect(pull).toBe(84);
    expect(groupTop(grown, pull)).toBe(groupTop(quote, 0));
  });

  it("eases off when the grown text would run past the bottom edge", () => {
    // Three of four lines at rest in a column with little slack: with
    // the top held, the fourth line would end 2.5px below the edge.
    const tight = { ...words, restLines: 3, lines: 3 };
    const grown = { ...tight, lines: 4 };
    const pull = growthPull(grown);
    expect(pull).toBe(84 - 5);
    // The group rises by exactly the overflow, so the last line ends on
    // the edge.
    const top = groupTop(grown, pull);
    expect(top).toBe(groupTop(tight, 0) - 2.5);
    expect(top + grown.above + grown.lines * grown.lineHeight).toBe(grown.outer);
  });

  it("never goes negative, even when the text can't fit either way", () => {
    expect(
      growthPull({ ...words, outer: 200, restLines: 1, lines: 3 }),
    ).toBe(0);
  });
});
