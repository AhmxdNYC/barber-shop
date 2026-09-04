import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Emits a self-contained server bundle with only the node_modules it
   * actually uses. Keeps the deployment image small enough to build and run
   * comfortably on a small VPS.
   */
  output: "standalone",
};

export default nextConfig;
