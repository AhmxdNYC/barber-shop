import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

/**
 * Integration tests truncate tables, so they must never run against the
 * development database. `.env.test` is loaded first and wins; `.env` only
 * fills in anything it does not set.
 */
loadEnv({ path: ".env.test" });
loadEnv({ path: ".env" });

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // The real `server-only` throws outside a React Server Component,
      // which is the point in the app and a problem in a Node test runner.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./src/test/global-setup.ts"],
    include: ["src/**/*.test.ts"],
    // Integration suites share one database; running files in parallel would
    // let one file's TRUNCATE land in the middle of another's assertions.
    fileParallelism: false,
  },
});
