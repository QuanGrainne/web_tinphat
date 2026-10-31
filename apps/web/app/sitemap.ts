import type { MetadataRoute } from "next";
import { apiGet } from "@/lib/api/server-fetch";
import type { SitemapData } from "@/lib/api/types";
import { siteUrl } from "@/lib/seo/metadata";

// Built per request from the live catalogue; never during `next build`.
export const dynamic = "force-dynamic";

const STATIC_PAGES = ["/gioi-thieu", "/chinh-sach", "/lien-he"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await apiGet<SitemapData>("/api/public/sitemap");
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...data.categories.map((c) => ({ url: `${base}/danh-muc/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...data.brands.map((b) => ({ url: `${base}/thuong-hieu/${b.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
    ...data.products.map((p) => ({
      url: `${base}/san-pham/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...STATIC_PAGES.map((path) => ({ url: `${base}${path}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
