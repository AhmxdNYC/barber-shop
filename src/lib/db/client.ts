import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * The Prisma client, created on first use rather than on import.
 *
 * This used to be constructed at module scope, which meant importing it —
 * from anything, even a module that never queries — threw when DATABASE_URL
 * was missing. That took down a build on a host with no database configured
 * before a single page rendered, and it defeated the fallbacks entirely:
 * code that catches a failed *query* never runs if the failure happens at
 * import.
 *
 * The instance is cached on globalThis because Next's dev server
 * re-evaluates modules on every edit, and a fresh client per reload exhausts
 * the connection pool within a few saves.
 */
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and fill it in.",
    );
  }
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/**
 * A stand-in that builds the real client the first time a model is touched.
 *
 * Importing is therefore free; only an actual query needs a database, and a
 * missing one surfaces as a rejected promise the callers already handle.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const client = globalForPrisma.prisma ?? createClient();
    const value = Reflect.get(client, property, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
