import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { CategoryTree } from "@/components/storefront/category-tree";
import { BrandFilter } from "@/components/storefront/listing-filters";
import { ListingSort } from "@/components/storefront/listing-sort";
import { DEFAULT_SORT, first, listingHref, parsePage, parseSort, toArray, type RawParams } from "@/components/storefront/listing-url";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { loadNav } from "@/components/storefront/shell-data";
import { apiGet, qs } from "@/lib/api/server-fetch";
import type { CategoryListing } from "@/lib/api/types";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildTrail, pageMetadata, siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function loadListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const brands = toArray(raw.brand);
  const sort = parseSort(first(raw.sort));
  const page = parsePage(first(raw.page));
  const data = await apiGet<CategoryListing>(
    `/api/public/categories/${encodeURIComponent(slug)}${qs({
      brand: brands,
      sort: sort === DEFAULT_SORT ? undefined : sort,
      page: page > 1 ? page : undefined,
    })}`,
  );
  return { slug, brands, sort, page, data };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page, data } = await loadListing(props);
  const base = `/danh-muc/${data.category.slug}`;
  return pageMetadata({
    title: page > 1 ? `${data.category.name} - Trang ${page}` : data.category.name,
    description: data.category.description ?? `${data.category.name}: ${data.total} sản phẩm. Giá đã gồm VAT.`,
    // Filtered and sorted views point at the plain listing; only the page number is kept.
    path: listingHref(base, { page }),
  });
}

export default async function CategoryPage(props: Props) {
  const { brands, sort, data } = await loadListing(props);
  const nav = await loadNav();
  const base = `/danh-muc/${data.category.slug}`;
  const trail = buildTrail(data.breadcrumb, { name: data.category.name, href: base });

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <section className="hero hero-s hero-box">
        <div className="hero-in">
          <h1>{data.category.name}</h1>
          <p>{data.total} sản phẩm</p>
        </div>
      </section>

      <div className="lst" style={{ marginTop: 12 }}>
        <aside>
          <BrandFilter
            key={brands.join("|")}
            action={base}
            sort={sort}
            brands={data.facets.brands}
            selected={brands}
            total={data.total}
          >
            {nav && <CategoryTree categories={nav.categories} activeSlug={data.category.slug} />}
          </BrandFilter>
        </aside>
        <section>
          <ListingSort total={data.total} sort={sort} hrefFor={(s) => listingHref(base, { brand: brands, sort: s })} />
          <h2 className="sr">Danh sách sản phẩm</h2>
          {data.items.length > 0 ? (
            <ProductGrid cards={data.items} variant="grid-4" />
          ) : (
            <div className="empty">
              <b>Không có sản phẩm phù hợp</b>
              <p>Thử bỏ bớt bộ lọc.</p>
            </div>
          )}
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            hrefFor={(p) => listingHref(base, { brand: brands, sort, page: p })}
          />
        </section>
      </div>
      <JsonLdScript data={breadcrumbJsonLd(trail, siteUrl())} />
    </main>
  );
}
