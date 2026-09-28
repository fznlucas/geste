import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // `_name` marks a value left out on purpose (destructuring to drop a field).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" }],
    },
  },
  {
    // Pages never read the mock tables directly: they go through @/lib/api (docs/mock-plan.md).
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["@/data", "@/data/*"], message: "Read data through @/lib/api." }] }],
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts", "reference/**", "public/**", "tsconfig.tsbuildinfo"]),
]);
