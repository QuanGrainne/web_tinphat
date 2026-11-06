import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { CatalogueSidebar } from "@/components/storefront/catalogue-sidebar";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { first, listingHref, parsePage, type RawParams } from "@/components/storefront/listing-url";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { contactHref, loadNav, loadProducts, loadSettings } from "@/components/storefront/shell-data";
import { apiGet, qs } from "@/lib/api/server-fetch";
import type { CategoryListing } from "@/lib/api/types";
import { breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { buildTrail, pageMetadata, siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<RawParams> };

async function loadListing({ params, searchParams }: Props) {
  const { slug } = await params;
  const raw = await searchParams;
  const page = parsePage(first(raw.page));
  const data = await apiGet<CategoryListing>(
    `/api/public/categories/${encodeURIComponent(slug)}${qs({ page: page > 1 ? page : undefined })}`,
  );
  return { page, data };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page, data } = await loadListing(props);
  return pageMetadata({
    title: page > 1 ? `${data.category.name} - Trang ${page}` : data.category.name,
    description: data.category.description ?? `${data.category.name}: ${data.total} sản phẩm của TÍN PHÁT DECORD.`,
    path: listingHref(`/danh-muc/${data.category.slug}`, { page }),
    image: data.category.imageUrl,
  });
}

export default async function CategoryPage(props: Props) {
  const { data } = await loadListing(props);
  const [nav, settings] = await Promise.all([loadNav(), loadSettings()]);
  // A category with few products still fills the page, with products from the other categories.
  const inCategory = new Set(data.items.map((item) => item.id));
  const others = data.total < 8 ? ((await loadProducts())?.items ?? []).filter((item) => !inCategory.has(item.id)).slice(0, 8) : [];
  const base = `/danh-muc/${data.category.slug}`;
  const trail = buildTrail(data.breadcrumb, { name: data.category.name, href: base });

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <div className="tp-shop">
        <CatalogueSidebar nav={nav} activeSlug={data.category.slug} settings={settings} />
        <section>
          <div className="tp-cat-hero">
            <div>
              <h1>{data.category.name}</h1>
              {data.category.description && <p>{data.category.description}</p>}
              <small>{data.total} sản phẩm</small>
            </div>
            {data.category.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
              <img src={data.category.imageUrl} alt="" width={800} height={600} fetchPriority="high" decoding="async" />
            )}
          </div>
          <h2 className="sr">Danh sách sản phẩm</h2>
          {data.items.length > 0 ? (
            <ProductGrid cards={data.items} variant="grid-4" contactHref={contactHref(settings)} />
          ) : (
            <div className="empty">
              <b>Chưa có sản phẩm</b>
              <p>Danh mục này đang được cập nhật.</p>
            </div>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} hrefFor={(p) => listingHref(base, { page: p })} />
          {others.length > 0 && (
            <div className="tp-others">
              <h2 className="tp-block-t">Sản phẩm khác</h2>
              <ProductGrid cards={others} variant="grid-4" contactHref={contactHref(settings)} />
            </div>
          )}
        </section>
      </div>
      <JsonLdScript data={breadcrumbJsonLd(trail, siteUrl())} />
    </main>
  );
}
