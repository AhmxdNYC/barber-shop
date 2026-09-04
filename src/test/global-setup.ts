import { execSync } from "node:child_process";

/**
 * Puts the test database into a known state once per run.
 *
 * Without this, suites depend on whatever the previous run left behind, and
 * a test that passes alone fails in the suite. Runs migrations then the same
 * seed the app uses, so tests exercise realistic data rather than fixtures
 * that have drifted from production shape.
 */
export default function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) return;
  if (!/_test(\?|$)/.test(url)) {
    throw new Error(`Refusing to reset non-test database: ${url}`);
  }
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { env, stdio: "pipe" });
}
