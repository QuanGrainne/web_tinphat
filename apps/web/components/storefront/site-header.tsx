import Link from "next/link";
import type { Nav, PublicSettings } from "@/lib/api/types";
import { CategoryDropdown } from "./category-dropdown";
import { NavLinks, type NavLinkItem } from "./nav-links";
import { SearchBox } from "./search-box";
import { telHref } from "./shell-data";

export function SiteHeader({
  nav,
  settings,
}: {
  nav: Nav | null;
  settings: PublicSettings | null;
}) {
  const hotline = settings?.hotline ?? null;
  const links: NavLinkItem[] = [
    { href: "/", label: "Trang chủ" },
    { href: "/san-pham", label: "Sản phẩm" },
    { href: "/gioi-thieu", label: "Về chúng tôi" },
    { href: "/gioi-thieu#nang-luc", label: "Năng lực", section: "nang-luc" },
    { href: "/lien-he", label: "Liên hệ", section: "lien-he" },
  ];
  return (
    <>
      <div className="util">
        <div className="wrap">
          <span className="tp-util">
            Sản xuất &amp; Phân phối sản phẩm decor
          </span>
          {hotline && (
            <a className="hot" href={telHref(hotline)}>
              <i className="i i-phone" aria-hidden="true" />
              Hotline: {hotline}
            </a>
          )}
        </div>
      </div>
      <header className="hd">
        <div className="wrap hd-in">
          {hotline && (
            <a
              className="hd-tel"
              href={telHref(hotline)}
              aria-label={`Gọi hotline ${hotline}`}
            >
              <i className="i i-phone" aria-hidden="true" />
            </a>
          )}
          <Link className="logo" href="/" aria-label="TÍN PHÁT DECOR">
            <b>TÍN PHÁT</b>
            <span>DECOR</span>
          </Link>
          <SearchBox />
          <nav className="hd-act" aria-label="Liên hệ">
            <Link className="act act-c" href="/lien-he">
              <span className="act-ico">
                <i className="i i-chat" aria-hidden="true" />
              </span>
              <span className="act-t">
                <b>Liên hệ hợp tác</b>
                {hotline && <small>{hotline}</small>}
              </span>
            </Link>
          </nav>
        </div>
      </header>
      <nav className="mnav" aria-label="Menu chính">
        <div className="wrap">
          {nav && nav.categories.length > 0 && (
            <CategoryDropdown categories={nav.categories} />
          )}
          <NavLinks links={links} />
          <Link className="cta" href="/lien-he">
            Liên hệ ngay
          </Link>
        </div>
      </nav>
    </>
  );
}
