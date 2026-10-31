import type { Crumb, PublicProduct, PublicSettings } from "@/lib/api/types";

export type JsonLd = Record<string, unknown>;

const SCHEMA = "https://schema.org";

function absolute(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl.replace(/\/+$/, "")}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * Serialise for an inline script tag. Every less-than sign is written as a unicode escape, so a product name
 * can never close the tag, and the two JS line separators are escaped as well.
 */
export function serializeJsonLd(data: JsonLd | JsonLd[]): string {
  return JSON.stringify(data)
    .replaceAll("<", "\\u003c")
    .replaceAll(LINE_SEPARATOR, "\\u2028")
    .replaceAll(PARAGRAPH_SEPARATOR, "\\u2029");
}

/** One Product with one Offer per SKU that has a visible price; no `offers` when every SKU is "Liên hệ". */
export function productJsonLd(product: PublicProduct, baseUrl: string): JsonLd {
  const url = absolute(baseUrl, `/san-pham/${product.slug}`);
  const offers = product.skus
    .filter((sku) => sku.priceVisible && sku.effectivePrice !== null)
    .map((sku) => ({
      "@type": "Offer",
      sku: sku.code,
      name: sku.unitName,
      price: sku.effectivePrice,
      priceCurrency: "VND",
      url,
      ...(sku.promoActive && sku.promoTo ? { priceValidUntil: sku.promoTo } : {}),
    }));
  const description = product.seoDescription ?? product.specLine ?? undefined;
  return {
    "@context": SCHEMA,
    "@type": "Product",
    name: product.name,
    sku: product.baseCode,
    url,
    ...(product.imageUrl ? { image: absolute(baseUrl, product.imageUrl) } : {}),
    ...(description ? { description } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(offers.length > 0 ? { offers } : {}),
  };
}

export function breadcrumbJsonLd(trail: Crumb[], baseUrl: string): JsonLd {
  return {
    "@context": SCHEMA,
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absolute(baseUrl, crumb.href),
    })),
  };
}

export function organizationJsonLd(settings: PublicSettings, baseUrl: string): JsonLd {
  const { company, hotline } = settings;
  return {
    "@context": SCHEMA,
    "@type": "Organization",
    name: company.name,
    url: absolute(baseUrl, "/"),
    telephone: hotline,
    email: company.email,
    taxID: company.taxCode,
    address: { "@type": "PostalAddress", streetAddress: company.address, addressCountry: "VN" },
  };
}
