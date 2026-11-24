import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    allowOnly: !process.env.CI,
    environment: "node",
    globals: true,
    reporters: process.env.CI
      ? [
          "default",
          ["json", { outputFile: "output/test-results/vitest.json" }],
        ]
      : ["default"],
    coverage: {
      provider: "v8",
      include: [
        "app/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "lib/**/*.{ts,tsx}",
        "proxy.ts",
      ],
      exclude: [
        "**/*.d.ts",
        "**/*.{test,spec}.{ts,tsx}",
        "lib/generated/**",
      ],
      reporter: ["text-summary", "json-summary", "lcov", "cobertura"],
      reportsDirectory: "coverage",
      reportOnFailure: true,
      thresholds: {
        statements: 61,
        branches: 56,
        functions: 64,
        lines: 62,
        "lib/security/**": {
          statements: 72,
          branches: 64,
          functions: 72,
          lines: 75,
        },
        "lib/ai/chats/**": {
          statements: 85,
          branches: 77,
          functions: 89,
          lines: 85,
        },
        "lib/supabase/**": {
          statements: 51,
          branches: 62,
          functions: 55,
          lines: 52,
        },
      },
    },
    // These scripts use Node's built-in test runner so they can be executed in
    // CI without loading the application test environment.
    exclude: [...configDefaults.exclude, "scripts/*.test.mjs", "tests/browser/**"],
  },
});
