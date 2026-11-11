import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The ad tool is its own site (ad-tool/ at the repository root, its own service). It stays at
    // this address, /ad-tool, so the links from the CRM and the agent photos kept in the database
    // (/ad-tool/images/...) keep working.
    const adTool = (process.env.AD_TOOL_ORIGIN || "http://localhost:3002").replace(/\/$/, "");
    return [{ source: "/ad-tool/:path*", destination: `${adTool}/ad-tool/:path*` }];
  },
  async redirects() {
    return [
      { source: "/", destination: "/buyers", permanent: false },
      // Candidates moved into the agents page.
      { source: "/candidates", destination: "/agents", permanent: false },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
