#!/usr/bin/env tsx
/**
 * Re-generates `src/data/wordlists/catalog.ts` from MonkeyType's
 * languages directory listing.
 *
 * Run manually when MonkeyType adds / renames wordlists:
 *   yarn wordlists:sync
 *
 * No env vars required — pulls from the unauthenticated GitHub
 * contents API. The catalog is just a list of ids; the wordlist
 * bodies themselves are fetched at runtime from jsdelivr (see
 * src/lib/wordlists/fetch.ts).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_URL =
  "https://api.github.com/repos/monkeytypegame/monkeytype/contents/frontend/static/languages?ref=master";
const OUT_PATH = join(process.cwd(), "src/data/wordlists/catalog.ts");

type ContentEntry = { name: string; type: string };

void (async () => {
  const res = await fetch(SOURCE_URL, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) {
    console.error(`GitHub contents API failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const entries = (await res.json()) as ContentEntry[];
  const ids = entries
    .filter(
      (e) =>
        e.type === "file" &&
        e.name.endsWith(".json") &&
        !e.name.startsWith("_"),
    )
    .map((e) => e.name.replace(/\.json$/, ""))
    .sort();

  const body = [
    "// Auto-generated from MonkeyType. Do not hand-edit; re-run",
    "// `yarn wordlists:sync` to refresh.",
    "export const WORDLIST_IDS = [",
    ...ids.map((id) => `  ${JSON.stringify(id)},`),
    "] as const;",
    "",
    "export type WordlistId = (typeof WORDLIST_IDS)[number];",
    "",
  ].join("\n");

  writeFileSync(OUT_PATH, body, "utf8");
  console.log(
    `wrote ${ids.length} wordlist ids → ${OUT_PATH.replace(process.cwd(), ".")}`,
  );
})();
