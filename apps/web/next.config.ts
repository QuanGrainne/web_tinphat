import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1600],
    imageSizes: [64, 128, 256, 384],
    remotePatterns: [{ protocol: "https", hostname: "**.kiotviet.vn" }],
    // resized copies are kept for a month; the source files never change under the same name
    minimumCacheTTL: 2_592_000,
  },
  // Browsers get /uploads from Caddy directly; this only lets the image optimiser read the same files.
  async rewrites() {
    return [{ source: "/uploads/:path*", destination: `${process.env.UPLOADS_ORIGIN ?? "http://caddy"}/uploads/:path*` }];
  },
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
