import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-grid";
import { contactHref, loadSettings } from "@/components/storefront/shell-data";
import { apiGet } from "@/lib/api/server-fetch";
import type { PublicProduct } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { renderMarkdown } from "@/lib/markdown";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";
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
    description: product.seoDescription ?? product.specLine ?? `${product.name} - TÍN PHÁT DECORD.`,
    path: `/san-pham/${product.slug}`,
    image: product.imageUrl,
    noindex: product.status === "DISCONTINUED",
  });
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, settings] = await Promise.all([loadProduct(slug), loadSettings()]);
  const phone = settings ? settings.hotline || settings.company.phone : null;
  const zalo = settings ? zaloHref(settings.zalo) : null;
  const discontinued = product.status === "DISCONTINUED";
  const price = (product.skus.find((sku) => sku.isBase) ?? product.skus[0])?.effectivePrice ?? null;
  const path = `/san-pham/${product.slug}`;
  const trail = buildTrail(product.breadcrumb, { name: product.name, href: path });
  const descriptionHtml = product.descriptionMd?.trim() ? renderMarkdown(product.descriptionMd) : null;

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <div className="pd">
        <ProductGallery images={[...(product.imageUrl ? [product.imageUrl] : []), ...product.galleryUrls]} name={product.name} />
        <div className="info">
          <h1>{product.name}</h1>
          {product.specLine && <p className="spec">{product.specLine}</p>}
          <div className="meta">
            <span>
              Mã sản phẩm: <b className="mono">{product.baseCode}</b>
            </span>
            {product.category && (
              <span>
                Danh mục: <Link href={`/danh-muc/${product.category.slug}`}>{product.category.name}</Link>
              </span>
            )}
          </div>
          {discontinued ? (
            <p className="notice" role="status">
              Sản phẩm đã ngừng kinh doanh.
            </p>
          ) : (
            <>
            <p className="tp-price">{price !== null ? formatVnd(price) : "Liên hệ"}</p>
            <div className="tp-contact">
              <b>Liên hệ để nhận báo giá</b>
              <p>Giá theo số lượng dành cho cửa hàng, đại lý và khách nhập số lượng lớn.</p>
              <div className="tp-acts">
                {phone && (
                  <a className="btn btn-pri btn-lg" href={telHref(phone)}>
                    <i className="i i-phone" aria-hidden="true" />
                    Gọi {formatPhone(phone)}
                  </a>
                )}
                {zalo && (
                  <a className="btn btn-out btn-lg" href={zalo} target="_blank" rel="noopener noreferrer">
                    <i className="i i-chat" aria-hidden="true" />
                    Nhắn Zalo
                  </a>
                )}
              </div>
            </div>
            </>
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
          <h2 className="sec-t">Cùng danh mục</h2>
          <div className="sec-b">
            <ProductGrid cards={product.related} variant="grid-5" contactHref={contactHref(settings)} />
          </div>
        </section>
      )}

      {!discontinued && <JsonLdScript data={[productJsonLd(product, siteUrl()), breadcrumbJsonLd(trail, siteUrl())]} />}
    </main>
  );
}
