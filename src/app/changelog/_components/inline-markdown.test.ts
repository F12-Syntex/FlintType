import { describe, expect, it } from "vitest";
import { parseInlineMarkdown } from "./inline-markdown";

describe("parseInlineMarkdown", () => {
  it("returns one plain run for a line without markers", () => {
    expect(parseInlineMarkdown("Fixed the footer link.")).toEqual([
      { kind: "text", text: "Fixed the footer link." },
    ]);
  });

  it("splits **bold** and `code` runs out of the line", () => {
    expect(
      parseInlineMarkdown("Each player presses **Ready**, then `/race` opens."),
    ).toEqual([
      { kind: "text", text: "Each player presses " },
      { kind: "strong", text: "Ready" },
      { kind: "text", text: ", then " },
      { kind: "code", text: "/race" },
      { kind: "text", text: " opens." },
    ]);
  });

  it("handles several markers and markers at the edges", () => {
    expect(parseInlineMarkdown("**Escape** or **Cmd+K**")).toEqual([
      { kind: "strong", text: "Escape" },
      { kind: "text", text: " or " },
      { kind: "strong", text: "Cmd+K" },
    ]);
  });

  it("leaves unpaired or empty markers as plain text", () => {
    expect(parseInlineMarkdown("2 ** 3 and a lone ` tick")).toEqual([
      { kind: "text", text: "2 ** 3 and a lone ` tick" },
    ]);
    expect(parseInlineMarkdown("empty **** pair")).toEqual([
      { kind: "text", text: "empty **** pair" },
    ]);
  });
});
