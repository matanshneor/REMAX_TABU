import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // The ad tool is a static page in public/ad-tool.
    return [{ source: "/ad-tool", destination: "/ad-tool/index.html" }];
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
