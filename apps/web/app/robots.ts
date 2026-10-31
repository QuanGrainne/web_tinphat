import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/metadata";

// The public origin comes from DNA_SITE_URL at runtime, so this must not be frozen at build time.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/gio-hang", "/bao-gia", "/don-hang/", "/tra-cuu-don", "/tim-kiem"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
