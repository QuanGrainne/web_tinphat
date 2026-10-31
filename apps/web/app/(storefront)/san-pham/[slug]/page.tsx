import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { ProductBuy } from "@/components/storefront/product-buy";
import { ProductGrid } from "@/components/storefront/product-grid";
import { apiGet } from "@/lib/api/server-fetch";
import type { PublicProduct } from "@/lib/api/types";
import { renderMarkdown } from "@/lib/markdown";
import { breadcrumbJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { buildTrail, pageMetadata, siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

// Called by both generateMetadata and the page; identical fetches within one render are de-duplicated.
function loadProduct(slug: string): Promise<PublicProduct> {
  return apiGet<PublicProduct>(`/api/public/products/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  return pageMetadata({
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.specLine ?? `${product.name}. Giá đã gồm VAT.`,
    path: `/san-pham/${product.slug}`,
    image: product.imageUrl,
    noindex: product.status === "DISCONTINUED",
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const discontinued = product.status === "DISCONTINUED";
  const path = `/san-pham/${product.slug}`;
  const trail = buildTrail(product.breadcrumb, { name: product.name, href: path });
  const descriptionHtml = product.descriptionMd?.trim() ? renderMarkdown(product.descriptionMd) : null;

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <div className="pd">
        <div className="gal">
          <div className="ph main">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
              <img src={product.imageUrl} alt={product.name} width={1200} height={1200} fetchPriority="high" decoding="async" />
            ) : (
              <i className="i i-image" aria-hidden="true" />
            )}
          </div>
        </div>
        <div className="info">
          <h1>{product.name}</h1>
          {product.specLine && <p className="spec">{product.specLine}</p>}
          {discontinued ? (
            <>
              <div className="meta">
                <span>
                  Mã hàng: <b className="mono">{product.baseCode}</b>
                </span>
                {product.brand && (
                  <span>
                    Thương hiệu: <b>{product.brand.name}</b>
                  </span>
                )}
              </div>
              <p className="notice" role="status">
                Sản phẩm đã ngừng kinh doanh.
              </p>
              {product.category && (
                <div className="acts" style={{ display: "flex" }}>
                  <Link className="btn btn-out" href={`/danh-muc/${product.category.slug}`}>
                    Xem {product.category.name}
                  </Link>
                </div>
              )}
            </>
          ) : (
            <ProductBuy brand={product.brand} skus={product.skus} />
          )}
        </div>
      </div>

      {descriptionHtml && (
        <section className="sec">
          <h2 className="sec-t">Mô tả</h2>
          <div className="sec-b desc" dangerouslySetInnerHTML={{ __html: descriptionHtml }} />
        </section>
      )}

      {product.related.length > 0 && (
        <section className="sec">
          <h2 className="sec-t">Cùng nhóm</h2>
          <div className="sec-b">
            <ProductGrid cards={product.related} variant="grid-5" />
          </div>
        </section>
      )}

      {!discontinued && <JsonLdScript data={[productJsonLd(product, siteUrl()), breadcrumbJsonLd(trail, siteUrl())]} />}
    </main>
  );
}
