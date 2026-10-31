import { describe, expect, it } from "vitest";
import { MAX_FILE_BYTES, MtImportError, readMonkeytypeFile } from "./read-file";

function kindOf(text: string): string | null {
  try {
    readMonkeytypeFile(text);
    return null;
  } catch (err) {
    return err instanceof MtImportError ? err.kind : "other";
  }
}

describe("readMonkeytypeFile", () => {
  it("returns the settings object", () => {
    expect(readMonkeytypeFile('{"caretStyle":"block"}')).toEqual({ caretStyle: "block" });
  });

  it("names what is wrong with a file that isn't MonkeyType settings", () => {
    expect(kindOf("not json")).toBe("not-json");
    expect(kindOf("[1,2]")).toBe("not-settings");
    expect(kindOf("null")).toBe("not-settings");
    expect(kindOf('"text"')).toBe("not-settings");
    expect(kindOf('{"app":"flinttype","version":1,"slices":{}}')).toBe("flinttype");
    expect(kindOf(" ".repeat(MAX_FILE_BYTES + 1))).toBe("too-big");
  });
});
