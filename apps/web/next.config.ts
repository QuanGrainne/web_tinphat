import type { NextConfig } from "next";

/**
 * Addresses of the company's previous website on this domain, still known to Google and shared in old links.
 * Each one moves permanently to the closest page here, so visitors land somewhere useful and the search
 * standing of the old page carries over. Unknown old addresses keep the 404 page; add them as Search
 * Console reports them (Indexing > Pages > Not found).
 */
const OLD_SITE_REDIRECTS = [
  // single pages found on Google
  { source: "/bongmais", destination: "/danh-muc/tet" },
  { source: "/cong-cau-vong-bong", destination: "/danh-muc/sinh-nhat-party" },
  { source: "/kem-cuon", destination: "/san-pham" },
  // old sections: every page under them goes to the matching category
  { source: "/hang-sinh-nhat/:path*", destination: "/danh-muc/sinh-nhat-party" },
  { source: "/hang-tet/:path*", destination: "/danh-muc/tet" },
  { source: "/hang-trung-thu/:path*", destination: "/danh-muc/trung-thu" },
  { source: "/hang-noel/:path*", destination: "/danh-muc/noel" },
  { source: "/hang-giang-sinh/:path*", destination: "/danh-muc/noel" },
].map((rule) => ({ ...rule, permanent: true }));

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
      ...OLD_SITE_REDIRECTS,
    ];
  },
  experimental: {
    // unmatched URLs render app/global-not-found.tsx (two root layouts, no shared one)
    globalNotFound: true,
  },
};

export default nextConfig;
