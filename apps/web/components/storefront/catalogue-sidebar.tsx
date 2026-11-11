import Link from "next/link";
import type { Nav, PublicSettings } from "@/lib/api/types";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";
import { CatalogImage } from "@/components/catalog-image";

/**
 * Left column of the catalogue: the category list with the quote hotline at its foot, kept in view while the page
 * scrolls. On phones only the category list stays, as a sideways-scrolling row.
 */
export function CatalogueSidebar({
  nav,
  activeSlug,
  settings,
}: {
  nav: Nav | null;
  activeSlug?: string | null;
  settings?: PublicSettings | null;
}) {
  const phone = settings ? settings.hotline || settings.company.phone : null;
  const zalo = settings ? zaloHref(settings.zalo) : null;
  const total =
    nav?.categories.reduce((sum, category) => sum + category.productCount, 0) ??
    0;
  /** `thumb` is the category picture, "grid" for the all-products row, undefined for sub-categories. */
  const link = (
    href: string,
    name: string,
    count: number,
    on: boolean,
    thumb?: string | null | "grid",
  ) => (
    <li key={href}>
      <Link
        href={href}
        prefetch={false}
        className={`${on ? "on" : ""}${thumb === undefined ? " sub" : ""}`.trim() || undefined}
        aria-current={on ? "page" : undefined}
      >
        {thumb === "grid" ? (
          <span className="tp-side-th" aria-hidden="true">
            <i className="i i-grid" />
          </span>
        ) : thumb ? (
          <CatalogImage
            className="tp-side-th"
            src={thumb}
            width={36}
            height={36}
            sizes="36px"
          />
        ) : thumb === null ? (
          <span className="tp-side-th" aria-hidden="true">
            <i className="i i-box" />
          </span>
        ) : null}
        <span>{name}</span>
        <small>{count}</small>
        <i className="i i-right tp-side-go" aria-hidden="true" />
      </Link>
    </li>
  );
  return (
    <aside className="tp-side" aria-label="Danh mục sản phẩm">
      <section className="tp-side-b tp-side-cat">
        <h2>
          <i className="i i-menu" aria-hidden="true" />
          Danh mục sản phẩm
        </h2>
        <ul>
          {link("/san-pham", "Tất cả sản phẩm", total, activeSlug === null, "grid")}
          {nav?.categories.flatMap((category) => [
            link(
              `/danh-muc/${category.slug}`,
              category.name,
              category.productCount,
              category.slug === activeSlug,
              category.imageUrl,
            ),
            ...category.children.map((child) =>
              link(
                `/danh-muc/${child.slug}`,
                child.name,
                child.productCount,
                child.slug === activeSlug,
              ),
            ),
          ])}
        </ul>
        {/* quote help sits at the foot of the same box, so it stays in view with the list and nothing slides over it */}
        {phone && (
          <div className="tp-side-call">
            <small>Liên Hệ</small>
            <a className="btn btn-pri" href={telHref(phone)}>
              <i className="i i-phone" aria-hidden="true" />
              {formatPhone(phone)}
            </a>
            {zalo && (
              <a
                className="btn btn-out"
                href={zalo}
                target="_blank"
                rel="noopener noreferrer"
              >
                Zalo
              </a>
            )}
          </div>
        )}
      </section>
    </aside>
  );
}
