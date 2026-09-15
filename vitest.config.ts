import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // These scripts use Node's built-in test runner so they can be executed in
    // CI without loading the application test environment.
    exclude: [...configDefaults.exclude, "scripts/*.test.mjs"],
  },
});
