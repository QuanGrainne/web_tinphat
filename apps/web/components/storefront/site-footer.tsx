import Link from "next/link";
import type { Nav, PublicSettings } from "@/lib/api/types";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";
import { BRAND } from "@/lib/tinphat/content";
import { SectionLink } from "./section-link";

const COMPANY_LINKS: { href: string; label: string; section?: string }[] = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Về chúng tôi" },
  { href: "/gioi-thieu#nang-luc", label: "Năng lực", section: "nang-luc" },
  { href: "/lien-he", label: "Liên hệ", section: "lien-he" },
];

const MAX_CATEGORIES = 6;

/** Dark site footer in the landing page's layout: brand, company links, categories, contact, then the bottom bars. */
export function SiteFooter({
  nav,
  settings,
}: {
  nav: Nav | null;
  settings: PublicSettings | null;
}) {
  const company = settings?.company ?? null;
  const categories = (nav?.categories ?? []).slice(0, MAX_CATEGORIES);
  const hotline = settings?.hotline ?? company?.phone ?? null;
  const zalo = settings?.zalo ?? null;
  return (
    <footer className="tp-ft">
      <div className="wrap tp-ft-grid">
        <div className="tp-ft-brand">
          <Link className="tp-ft-logo" href="/" aria-label={BRAND.name}>
            <span className="tp-ft-mark" aria-hidden="true">
              T
            </span>
            <span>
              <b>TÍN PHÁT</b>
              <small>DECOR</small>
            </span>
          </Link>
          <p className="tp-ft-tag">{BRAND.tagline}</p>
          <p className="tp-ft-desc">
            Sản xuất và phân phối các sản phẩm trang trí theo mùa và quanh năm —
            phục vụ cửa hàng, đại lý và khách hàng nhập số lượng lớn.
          </p>
          {company && (
            <p className="tp-ft-co">
              {company.name}
              {company.taxCode && (
                <>
                  <br />
                  Mã số doanh nghiệp: {company.taxCode}
                </>
              )}
            </p>
          )}
        </div>

        <div>
          <h3>Công ty</h3>
          <ul className="tp-ft-links">
            {COMPANY_LINKS.map((link) => (
              <li key={link.href}>
                {link.section ? (
                  <SectionLink href={link.href} section={link.section}>
                    {link.label}
                  </SectionLink>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Sản phẩm</h3>
          <ul className="tp-ft-links">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/danh-muc/${category.slug}`} prefetch={false}>
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/san-pham">Tất cả sản phẩm →</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Liên hệ</h3>
          <dl className="tp-ft-contact">
            {hotline && (
              <div>
                <dt>Hotline</dt>
                <dd>
                  <a href={telHref(hotline)}>{formatPhone(hotline)}</a>
                </dd>
              </div>
            )}
            {zalo && (
              <div>
                <dt>Zalo</dt>
                <dd>
                  <a
                    href={zaloHref(zalo) ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatPhone(zalo)}
                  </a>
                </dd>
              </div>
            )}
            {company?.email && (
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${company.email}`}>{company.email}</a>
                </dd>
              </div>
            )}
            {company?.address && (
              <div>
                <dt>Địa chỉ</dt>
                <dd>{company.address}</dd>
              </div>
            )}
            {company?.warehouse && (
              <div>
                <dt>Kho hàng</dt>
                <dd>{company.warehouse}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="tp-ft-bar">
        <div className="wrap">
          <p>Sản xuất &amp; Phân phối sản phẩm Decor</p>
        </div>
      </div>
      <div className="tp-ft-credit">
        <div className="wrap">
          Website được tạo bởi quangrainne:{" "}
          <a href="mailto:dinhnhatquan0311@gmail.com">
            dinhnhatquan0311@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
