import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { CategoryFacet } from "@/components/storefront/category-facet";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { ListingSort } from "@/components/storefront/listing-sort";
import { DEFAULT_SORT, first, listingHref, parsePage, parseSort, type RawParams } from "@/components/storefront/listing-url";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { apiGet, qs } from "@/lib/api/server-fetch";
import type { BrandListing } from "@/lib/api/types";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildTrail, pageMetadata, siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function loadListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const category = first(raw.category)?.trim() || undefined;
  const sort = parseSort(first(raw.sort));
  const page = parsePage(first(raw.page));
  const data = await apiGet<BrandListing>(
    `/api/public/brands/${encodeURIComponent(slug)}${qs({
      category,
      sort: sort === DEFAULT_SORT ? undefined : sort,
      page: page > 1 ? page : undefined,
    })}`,
  );
  return { category, sort, page, data };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page, data } = await loadListing(props);
  const base = `/thuong-hieu/${data.brand.slug}`;
  return pageMetadata({
    title: page > 1 ? `${data.brand.name} - Trang ${page}` : data.brand.name,
    description: data.brand.description ?? `Sản phẩm ${data.brand.name}: ${data.total} sản phẩm. Giá đã gồm VAT.`,
    path: listingHref(base, { page }),
  });
}

export default async function BrandPage(props: Props) {
  const { category, sort, data } = await loadListing(props);
  const base = `/thuong-hieu/${data.brand.slug}`;
  const trail = buildTrail(data.breadcrumb, { name: data.brand.name, href: base });

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <section className="hero hero-s hero-box">
        <div className="hero-in">
          <h1>{data.brand.name}</h1>
          <p>{data.total} sản phẩm</p>
        </div>
      </section>

      <div className="lst" style={{ marginTop: 12 }}>
        <aside>
          <CategoryFacet
            categories={data.facets.categories}
            activeSlug={category}
            total={data.total}
            hrefFor={(slug) => listingHref(base, { category: slug, sort })}
          />
        </aside>
        <section>
          <ListingSort total={data.total} sort={sort} hrefFor={(s) => listingHref(base, { category, sort: s })} />
          <h2 className="sr">Danh sách sản phẩm</h2>
          {data.items.length > 0 ? (
            <ProductGrid cards={data.items} variant="grid-4" />
          ) : (
            <div className="empty">
              <b>Không có sản phẩm phù hợp</b>
              <p>Thử chọn danh mục khác.</p>
            </div>
          )}
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            hrefFor={(p) => listingHref(base, { category, sort, page: p })}
          />
        </section>
      </div>
      <JsonLdScript data={breadcrumbJsonLd(trail, siteUrl())} />
    </main>
  );
}
