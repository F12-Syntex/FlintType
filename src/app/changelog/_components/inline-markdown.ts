/** A run of changelog text: plain, `**bold**` or `` `code` ``. */
export type InlineSegment = { kind: "text" | "strong" | "code"; text: string };

const TOKEN = /(\*\*[^*\n]+?\*\*|`[^`\n]+?`)/g;

/** Split one changelog line into plain, bold and code runs, so the page
 *  can render the little markdown the file uses instead of printing the
 *  markers. Unpaired markers stay as plain text; adjacent plain runs are
 *  merged. */
export function parseInlineMarkdown(line: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const push = (kind: InlineSegment["kind"], text: string) => {
    if (!text) return;
    const last = segments[segments.length - 1];
    if (kind === "text" && last?.kind === "text") last.text += text;
    else segments.push({ kind, text });
  };
  for (const part of line.split(TOKEN)) {
    if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
      push("strong", part.slice(2, -2));
    } else if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      push("code", part.slice(1, -1));
    } else {
      push("text", part);
    }
  }
  return segments;
}
