import type { NextConfig } from "next";

const crm = new URL(process.env.CRM_URL || "https://remax-tabu.up.railway.app");
const supabase = new URL(process.env.SUPABASE_URL || "https://ydelaanmjjxpvlplrsmm.supabase.co");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Listing photos come through /media (this site); the agent's portrait from the CRM site
    // or the public agent-photos bucket.
    remotePatterns: [
      { protocol: "https", hostname: crm.hostname, pathname: "/ad-tool/images/**" },
      { protocol: "https", hostname: supabase.hostname, pathname: "/storage/v1/object/public/agent-photos/**" },
    ],
    // A listing that leaves the site stops serving its photos within minutes.
    minimumCacheTTL: 600,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
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
