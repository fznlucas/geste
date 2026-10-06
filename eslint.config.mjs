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
    // Pages never read the mock tables, the simulation or the business config directly: rows come from
    // @/lib/api, figures from @/lib/metrics (docs/mock-plan.md, docs/admin-v2/PROMPT.md).
    files: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["@/data", "@/data/*"], message: "Read data through @/lib/api." },
          { group: ["@/sim", "@/sim/*"], message: "Read simulated rows through @/lib/api and figures through @/lib/metrics." },
          { group: ["@/config", "@/config/*"], message: "Read business settings through @/lib/api or @/lib/metrics." },
        ],
      }],
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**", "next-env.d.ts", "reference/**", "public/**", "tsconfig.tsbuildinfo"]),
]);
