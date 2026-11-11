import Image from "next/image";
import Link from "next/link";
import type { Nav, PublicSettings } from "@/lib/api/types";
import {
  facebookHref,
  facebookLabel,
  formatPhone,
  telHref,
  whatsappHref,
  whatsappLabel,
  zaloHref,
  zaloLabel,
} from "@/lib/order/phone";
import { BRAND } from "@/lib/tinphat/content";
import { FacebookIcon, WhatsAppIcon, ZaloMark } from "./brand-icons";
import { CopyText } from "./copy-text";
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
  const zaloLink = zaloHref(zalo);
  const facebook = facebookHref(settings?.facebook ?? null);
  const whatsapp = settings?.whatsapp ?? null;
  const whatsappLink = whatsappHref(whatsapp);
  const wechat = settings?.wechat ?? null;
  return (
    <footer className="tp-ft">
      <div className="wrap tp-ft-grid">
        <div className="tp-ft-brand">
          <Link className="tp-ft-logo" href="/" aria-label={BRAND.name}>
            <Image
              src="/images/tinphat/logo.png"
              alt="TÍN PHÁT"
              width={88}
              height={64}
            />
          </Link>
          <p className="tp-ft-tag">{BRAND.tagline}</p>
          <p className="tp-ft-desc">
            Sản xuất và phân phối các sản phẩm trang trí theo mùa và quanh năm —
            phục vụ cửa hàng, đại lý và khách hàng nhập số lượng lớn.
          </p>
          {(zaloLink || facebook || whatsappLink) && (
            <div className="tp-ft-social">
              {facebook && (
                <a
                  className="tp-soc tp-soc-fb"
                  href={facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <FacebookIcon />
                </a>
              )}
              {zaloLink && (
                <a
                  className="tp-soc tp-soc-zalo"
                  href={zaloLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Zalo"
                >
                  <ZaloMark />
                </a>
              )}
              {whatsappLink && (
                <a
                  className="tp-soc tp-soc-wa"
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  <WhatsAppIcon />
                </a>
              )}
            </div>
          )}
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
            {zalo && zaloLink && (
              <div>
                <dt>Zalo</dt>
                <dd>
                  <a href={zaloLink} target="_blank" rel="noopener noreferrer">
                    {zaloLabel(zalo)}
                  </a>
                </dd>
              </div>
            )}
            {facebook && (
              <div>
                <dt>Facebook</dt>
                <dd>
                  <a href={facebook} target="_blank" rel="noopener noreferrer">
                    {facebookLabel(facebook)}
                  </a>
                </dd>
              </div>
            )}
            {whatsapp && whatsappLink && (
              <div>
                <dt>WhatsApp</dt>
                <dd>
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {whatsappLabel(whatsapp)}
                  </a>
                </dd>
              </div>
            )}
            {wechat && (
              <div>
                <dt>WeChat</dt>
                <dd>
                  <CopyText value={wechat} label="WeChat ID" />
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
