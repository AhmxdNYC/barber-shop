import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 moved the connection URL out of schema.prisma and no longer
 * loads .env on its own, so the import above is required for CLI commands.
 * The Next.js runtime loads .env itself and reaches the database through a
 * driver adapter in src/lib/db.ts.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    /**
     * Generating the client does not connect to anything, but the config is
     * still read — so a build on a host without DATABASE_URL set would fail
     * before it reached a single line of application code. The placeholder
     * keeps `prisma generate` working; migrations still require the real
     * value, and would fail loudly against this one.
     */
    url:
      process.env.DATABASE_URL ??
      "postgresql://unset:unset@localhost:5432/unset",
  },
});
