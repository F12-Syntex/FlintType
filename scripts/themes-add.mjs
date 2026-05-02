#!/usr/bin/env node
// Usage: yarn themes:add <tweakcn-theme-url>
//
// Fetches a shadcn-registry-shaped theme JSON (tweakcn or compatible) and
// appends it to src/lib/themes/themes.json so it shows up in the
// Appearance page's theme picker. Idempotent — re-running with the same
// URL replaces the existing entry.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const THEMES_FILE = path.join(ROOT, "src/lib/themes/themes.json");

function die(msg) {
  console.error(`themes:add — ${msg}`);
  process.exit(1);
}

function slugify(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const url = process.argv[2];
if (!url) die("missing URL.\nUsage: yarn themes:add <tweakcn-theme-url>");
if (!/^https?:\/\//i.test(url)) die(`not a URL: ${url}`);

const res = await fetch(url, { headers: { Accept: "application/json" } });
if (!res.ok) die(`fetch ${url} failed (${res.status} ${res.statusText})`);

const data = await res.json();
if (!data || !data.cssVars || !data.cssVars.light || !data.cssVars.dark) {
  die("response is not a shadcn registry theme (missing cssVars.light/dark)");
}

const name = data.name || "Untitled theme";
const id = slugify(name);
if (!id) die(`could not derive an id from name "${name}"`);

const entry = {
  id,
  name,
  source: url,
  cssVars: {
    theme: data.cssVars.theme || {},
    light: data.cssVars.light,
    dark: data.cssVars.dark,
  },
};

const raw = await fs.readFile(THEMES_FILE, "utf8").catch(() => "[]");
const themes = JSON.parse(raw);
const idx = themes.findIndex((t) => t.id === id);
if (idx >= 0) {
  themes[idx] = entry;
  console.log(`themes:add — replaced "${id}"`);
} else {
  themes.push(entry);
  console.log(`themes:add — added "${id}"`);
}
themes.sort((a, b) => a.name.localeCompare(b.name));
await fs.writeFile(THEMES_FILE, `${JSON.stringify(themes, null, 2)}\n`);
console.log(`themes:add — wrote ${THEMES_FILE} (${themes.length} themes)`);
