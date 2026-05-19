import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Read the project VERSION file at build time and expose it to the bundle
// as NEXT_PUBLIC_APP_VERSION. `process.cwd()` in next.config.ts evaluates
// to the project root (where `yarn dev` / `yarn build` was started).
let appVersion = "0.0.0";
try {
  appVersion = readFileSync(path.join(process.cwd(), "VERSION"), "utf-8").trim();
} catch {
  // VERSION file missing — fall through to default.
}

const nextConfig: NextConfig = {
  // Disable Next.js's in-page dev devtools panel — it throws
  // `Failed to execute 'releasePointerCapture'` errors from its own
  // pointer-event handlers (next-devtools/index_*.js). Pure dev-only.
  devIndicators: false,
  // Pin turbopack's root resolution to this project's directory.
  // Without this, Next walks up looking for the nearest lockfile;
  // a sibling lockfile (e.g. one in C:\Users\synte\Programming) makes
  // it warn about "additional lockfiles" and ambiguous root selection.
  turbopack: {
    root: process.cwd(),
  },
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
  // Ship the quote pool to every serverless function so the race
  // quote mode can pick passages at room-creation time without a
  // network hop. Without this, Vercel only bundles files reachable
  // from imports; the server reads the JSON via fs.readFileSync, so
  // we trace it explicitly.
  outputFileTracingIncludes: {
    "/**": ["./public/quotes/monkeytype/english.json"],
  },
};

export default nextConfig;
