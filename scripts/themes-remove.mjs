#!/usr/bin/env node
// Usage: yarn themes:remove <theme-id>
//
// Drops a theme entry from src/lib/themes/themes.json by its id (the
// slugified name printed by themes:add). No-op if the id isn't found.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const THEMES_FILE = path.join(ROOT, "src/lib/themes/themes.json");

function die(msg) {
  console.error(`themes:remove — ${msg}`);
  process.exit(1);
}

const id = process.argv[2];
if (!id) die("missing id.\nUsage: yarn themes:remove <theme-id>");

const raw = await fs.readFile(THEMES_FILE, "utf8").catch(() => "[]");
const themes = JSON.parse(raw);
const before = themes.length;
const next = themes.filter((t) => t.id !== id);
if (next.length === before) {
  console.log(`themes:remove — no theme with id "${id}" (nothing to do)`);
  process.exit(0);
}
await fs.writeFile(THEMES_FILE, `${JSON.stringify(next, null, 2)}\n`);
console.log(`themes:remove — removed "${id}" (${next.length} remaining)`);
