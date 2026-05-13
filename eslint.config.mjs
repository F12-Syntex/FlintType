import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored skill scripts — `impeccable` ships its own bundles
    // (modern-screenshot, live-browser, etc.) and helper mjs under
    // `.agents/skills/<skill>/scripts/`. They are tooling, not project
    // source, and trigger thousands of irrelevant lint warnings.
    ".agents/skills/**",
  ]),
  {
    rules: {
      // `react/no-unescaped-entities` flags apostrophes and quotes in
      // JSX text and asks you to write `&apos;` / `&quot;` instead.
      // Browsers parse the literal characters fine, so the rule
      // protects against nothing — it just clutters editorial copy
      // in /about, /faq, /privacy, /terms. Leave the literal
      // characters in place.
      "react/no-unescaped-entities": "off",
      // Accept `_`-prefixed parameters / vars / destructures as
      // intentional unused. This is the standard escape hatch — see
      // the `_enterQueueShell` prop in `race-state.tsx` where the
      // type is required for API parity but the body doesn't read it.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
