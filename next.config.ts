import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits a self-contained server bundle with only the node_modules it
   * actually uses, so the deployment image stays small enough to build and
   * run on a modest VPS.
   */
  output: "standalone",

  /**
   * Keep the Postgres driver out of the bundle.
   *
   * Bundling `pg` breaks its authentication negotiation — connections fail
   * with "failed to verify trust authentication" even though the same
   * connection string works from plain Node. These packages use dynamic
   * requires and native protocol handling that the bundler cannot follow, so
   * they must be loaded normally at runtime.
   */
  serverExternalPackages: ["pg", "@prisma/adapter-pg", "@prisma/client"],
};

export default nextConfig;
