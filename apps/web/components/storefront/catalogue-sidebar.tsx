import Link from "next/link";
import type { Nav, ProductCard, PublicSettings } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";
import { IMAGES } from "@/lib/tinphat/content";

/** Left column of the catalogue. On phones only the category list stays, as a sideways-scrolling row. */
export function CatalogueSidebar({
  nav,
  activeSlug,
  settings,
  featured = [],
}: {
  nav: Nav | null;
  activeSlug?: string | null;
  settings?: PublicSettings | null;
  /** Short product list under the categories (home page). */
  featured?: ProductCard[];
}) {
  const phone = settings ? settings.hotline || settings.company.phone : null;
  const zalo = settings ? zaloHref(settings.zalo) : null;
  const total = nav?.categories.reduce((sum, category) => sum + category.productCount, 0) ?? 0;
  const link = (href: string, name: string, count: number, on: boolean, sub = false) => (
    <li key={href}>
      <Link href={href} prefetch={false} className={`${on ? "on" : ""}${sub ? " sub" : ""}`.trim() || undefined} aria-current={on ? "page" : undefined}>
        <span>{name}</span>
        <small>{count}</small>
      </Link>
    </li>
  );
  return (
    <aside className="tp-side" aria-label="Danh mục sản phẩm">
      <section className="tp-side-b">
        <h2>Danh mục sản phẩm</h2>
        <ul>
          {link("/san-pham", "Tất cả sản phẩm", total, activeSlug === null)}
          {nav?.categories.flatMap((category) => [
            link(`/danh-muc/${category.slug}`, category.name, category.productCount, category.slug === activeSlug),
            ...category.children.map((child) => link(`/danh-muc/${child.slug}`, child.name, child.productCount, child.slug === activeSlug, true)),
          ])}
        </ul>
      </section>

      {featured.length > 0 && (
        <section className="tp-side-b tp-side-more">
          <h2>Sản phẩm tiêu biểu</h2>
          <div className="tp-side-list">
            {featured.map((product) => (
              <Link key={product.id} href={`/san-pham/${product.slug}`} prefetch={false}>
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
                  <img src={product.imageUrl} alt="" width={64} height={64} loading="lazy" decoding="async" />
                ) : (
                  <span className="ph">
                    <i className="i i-image" aria-hidden="true" />
                  </span>
                )}
                <span>
                  {product.name}
                  <b>{product.fromPrice !== null ? formatVnd(product.fromPrice) : "Liên hệ"}</b>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {phone && (
        <section className="tp-side-b tp-side-more">
          <h2>Hỗ trợ báo giá</h2>
          <div className="tp-side-c">
            <p>Cần báo giá số lượng lớn?</p>
            <a className="btn btn-pri" href={telHref(phone)}>
              <i className="i i-phone" aria-hidden="true" />
              {formatPhone(phone)}
            </a>
            {zalo && (
              <a className="btn btn-out" href={zalo} target="_blank" rel="noopener noreferrer">
                Nhắn Zalo
              </a>
            )}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS
        <img className="tp-side-i tp-side-more" src={IMAGES.warehouse} alt="Nhà xưởng TÍN PHÁT DECORD" width={600} height={400} loading="lazy" decoding="async" />
      )}
    </aside>
  );
}
