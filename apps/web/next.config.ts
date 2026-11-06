import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  // Catalogue site: the sales pages stay in the code but customers contact the company instead.
  async redirects() {
    return [
      { source: "/gio-hang", destination: "/lien-he", permanent: false },
      { source: "/bao-gia", destination: "/lien-he", permanent: false },
      { source: "/tra-cuu-don", destination: "/lien-he", permanent: false },
      { source: "/don-hang/:code", destination: "/lien-he", permanent: false },
      { source: "/chinh-sach", destination: "/gioi-thieu", permanent: false },
      { source: "/thuong-hieu/:slug", destination: "/san-pham", permanent: false },
    ];
  },
  experimental: {
    // unmatched URLs render app/global-not-found.tsx (two root layouts, no shared one)
    globalNotFound: true,
  },
};

export default nextConfig;
