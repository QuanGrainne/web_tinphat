import Link from "next/link";
import type { Nav, PublicSettings } from "@/lib/api/types";
import { CategoryMenu } from "./category-menu";
import { HeaderCounters } from "./header-counters";
import { NavLinks, type NavLinkItem } from "./nav-links";
import { SearchBox } from "./search-box";
import { telHref } from "./shell-data";

export function SiteHeader({ nav, settings }: { nav: Nav | null; settings: PublicSettings | null }) {
  const hotline = settings?.hotline ?? null;
  const links: NavLinkItem[] = [
    { href: "/", label: "Trang chủ" },
    ...(nav?.categories ?? []).map((c) => ({ href: `/danh-muc/${c.slug}`, label: c.name })),
    { href: "/gioi-thieu", label: "Giới thiệu" },
    { href: "/lien-he", label: "Liên hệ" },
  ];
  return (
    <>
      <div className="util">
        <div className="wrap">
          <Link href="/tra-cuu-don">Tra cứu đơn</Link>
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
            <a className="hd-tel" href={telHref(hotline)} aria-label={`Gọi hotline ${hotline}`}>
              <i className="i i-phone" aria-hidden="true" />
            </a>
          )}
          <Link className="logo" href="/" aria-label="DNA Hoàng Nguyên">
            <b>DNA</b>
            <span>Hoàng Nguyên</span>
          </Link>
          {nav && <CategoryMenu nav={nav} />}
          <SearchBox />
          <HeaderCounters />
        </div>
        <nav className="mnav" aria-label="Menu chính">
          <div className="wrap">
            <NavLinks links={links} />
            <Link className="cta" href="/bao-gia">
              Đại lý &amp; Mua sỉ
            </Link>
          </div>
        </nav>
      </header>
    </>
  );
}
