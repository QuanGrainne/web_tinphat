import { apiGet } from "@/lib/api/server-fetch";
import type { Nav, Page, ProductCard, PublicSettings } from "@/lib/api/types";

/**
 * Header/footer data. A failure here must not take the whole page down (the shell wraps every route,
 * so a throw would skip the route error page); the shell degrades and the page itself surfaces API errors.
 */
async function loadOptional<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch (error) {
    console.error(`storefront shell: ${path} unavailable`, error);
    return null;
  }
}

export function loadNav(): Promise<Nav | null> {
  return loadOptional<Nav>("/api/public/nav");
}

/** First page of all products, for the "Sản phẩm khác" block; the page still works without it. */
export function loadProducts(): Promise<Page<ProductCard> | null> {
  return loadOptional<Page<ProductCard>>("/api/public/products");
}

export function loadSettings(): Promise<PublicSettings | null> {
  return loadOptional<PublicSettings>("/api/public/settings");
}

/** Digits only, for tel: links ("0366 985 679" -> "0366985679"). */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Where "Liên hệ ngay" goes: Zalo when set, else the hotline, else the contact page. */
export function contactHref(settings: PublicSettings | null): string {
  const zalo = settings?.zalo?.replace(/\D/g, "");
  if (zalo) return `https://zalo.me/${zalo}`;
  return settings?.hotline ? telHref(settings.hotline) : "/lien-he";
}
