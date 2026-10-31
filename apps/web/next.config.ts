import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    // unmatched URLs render app/global-not-found.tsx (two root layouts, no shared one)
    globalNotFound: true,
  },
};

export default nextConfig;
