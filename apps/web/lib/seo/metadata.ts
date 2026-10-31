import type { Metadata } from "next";
import type { Crumb } from "@/lib/api/types";

export const SITE_NAME = "DNA Hoàng Nguyên";
const DEFAULT_SITE_URL = "http://localhost:8000";

/** Public origin, read at request time from DNA_SITE_URL (no trailing slash). */
export function siteUrl(): string {
  return (process.env.DNA_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export interface PageMeta {
  /** Plain page title; the layout template appends the site name. */
  title: string;
  description?: string;
  /** Canonical path (relative; resolved against metadataBase). */
  path: string;
  image?: string | null;
  noindex?: boolean;
}

export function pageMetadata(meta: PageMeta): Metadata {
  return {
    title: meta.title,
    ...(meta.description ? { description: meta.description } : {}),
    alternates: { canonical: meta.path },
    openGraph: {
      type: "website",
      locale: "vi_VN",
      siteName: SITE_NAME,
      title: `${meta.title} | ${SITE_NAME}`,
      ...(meta.description ? { description: meta.description } : {}),
      url: meta.path,
      ...(meta.image ? { images: [meta.image] } : {}),
    },
    ...(meta.noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/**
 * Full breadcrumb trail: home, the API crumbs (without a duplicate of the current page), then the current page.
 * Used by both the visible breadcrumb and the BreadcrumbList data.
 */
export function buildTrail(crumbs: Crumb[], current: Crumb): Crumb[] {
  const middle = crumbs.filter((c) => c.href !== "/" && c.href !== current.href && c.name !== current.name);
  return [{ name: "Trang chủ", href: "/" }, ...middle, current];
}
