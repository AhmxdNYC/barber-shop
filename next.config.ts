import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * A self-contained server bundle, for running in a container on a VPS —
   * see docs/DEPLOY-VULTR.md. Vercel does its own tracing and bundling, and
   * the two conflict: a standalone build there fails looking for a trace
   * manifest Vercel never writes. So it is only asked for where it is
   * actually used.
   */
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),

  /**
   * Keep the Postgres driver out of the bundle.
   *
   * Bundling `pg` breaks its authentication negotiation — connections fail
   * with "failed to verify trust authentication" even though the same
   * connection string works from plain Node. These packages use dynamic
   * requires and native protocol handling the bundler cannot follow, so they
   * are loaded normally at runtime.
   */
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
};

export default nextConfig;
