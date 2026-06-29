/**
 * ------------------------------------------------------------------
 * File: eslint.config.mjs
 * Description: ESLint flat configuration for the Norm8 Next.js application.
 * Responsibilities:
 * - Load Next.js Core Web Vitals and TypeScript linting presets.
 * - Keep generated build artifacts out of lint runs.
 * - Remain compatible with the installed ESLint 8 runtime.
 * ------------------------------------------------------------------
 */

import nextVitals from "eslint-config-next/core-web-vitals.js";
import nextTs from "eslint-config-next/typescript.js";
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  ...compat.config(nextVitals),
  ...compat.config(nextTs),
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
