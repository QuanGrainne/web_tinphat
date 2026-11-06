import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { CatalogueSidebar } from "@/components/storefront/catalogue-sidebar";
import { first, listingHref, parsePage, type RawParams } from "@/components/storefront/listing-url";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { contactHref, loadNav, loadSettings } from "@/components/storefront/shell-data";
import { apiGet, qs } from "@/lib/api/server-fetch";
import type { Page, ProductCard } from "@/lib/api/types";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Sản phẩm",
  description: "Toàn bộ sản phẩm trang trí theo mùa lễ hội và quanh năm của TÍN PHÁT DECORD.",
  path: "/san-pham",
});

/** Every product, with the categories on the left. */
export default async function CataloguePage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const page = parsePage(first((await searchParams).page));
  const [data, nav, settings] = await Promise.all([
    apiGet<Page<ProductCard>>(`/api/public/products${qs({ page: page > 1 ? page : undefined })}`),
    loadNav(),
    loadSettings(),
  ]);
  return (
    <main className="wrap">
      <Breadcrumb
        trail={[
          { name: "Trang chủ", href: "/" },
          { name: "Sản phẩm", href: "/san-pham" },
        ]}
      />
      <div className="tp-shop">
        <CatalogueSidebar nav={nav} activeSlug={null} settings={settings} />
        <section>
          <div className="tp-shop-h">
            <h1>Tất cả sản phẩm</h1>
            <small>{data.total} sản phẩm</small>
          </div>
          {data.items.length > 0 ? (
            <ProductGrid cards={data.items} variant="grid-4" contactHref={contactHref(settings)} />
          ) : (
            <div className="empty">
              <b>Chưa có sản phẩm</b>
              <p>Sản phẩm sẽ sớm được cập nhật.</p>
            </div>
          )}
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} hrefFor={(p) => listingHref("/san-pham", { page: p })} />
        </section>
      </div>
    </main>
  );
}
