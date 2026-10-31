"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Nav } from "@/lib/api/types";
import { countLines, useCart } from "@/lib/cart/cart-store";

/** Pages that carry their own sticky action bar instead of the dock. */
function hidesDock(pathname: string): boolean {
  return pathname.startsWith("/san-pham/") || pathname === "/gio-hang";
}

/** Bottom dock (mobile) plus the Danh mục bottom sheet it opens (CSS :target, no client state). */
export function MobileDock({ nav }: { nav: Nav | null }) {
  const pathname = usePathname();
  const cart = useCart();
  if (hidesDock(pathname)) return null;
  const quote = countLines(cart, "quote");
  const cls = (on: boolean) => (on ? "on" : undefined);
  return (
    <>
      <nav className="dock" aria-label="Điều hướng nhanh">
        <a href="#cats">
          <i className="i i-grid" aria-hidden="true" />
          Danh mục
        </a>
        <Link href="/" className={cls(pathname === "/")}>
          <i className="i i-home" aria-hidden="true" />
          Trang chủ
        </Link>
        <Link href="/tra-cuu-don" className={cls(pathname === "/tra-cuu-don" || pathname.startsWith("/don-hang/"))}>
          <i className="i i-box" aria-hidden="true" />
          Tra cứu đơn
        </Link>
        <Link href="/bao-gia" className={cls(pathname === "/bao-gia")} aria-label={quote > 0 ? `Báo giá, ${quote} sản phẩm` : "Báo giá"}>
          <i className="i i-doc" aria-hidden="true" />
          Báo giá
          {quote > 0 && <em>{quote}</em>}
        </Link>
      </nav>
      {nav && (
        <div className="sheet only-m" id="cats" aria-label="Danh mục">
          <a className="scrim" href="#x" aria-label="Đóng" />
          <div className="panel">
            <div className="sheet-h">
              <span>Danh mục</span>
              <a href="#x" aria-label="Đóng">
                <i className="i i-x" aria-hidden="true" />
              </a>
            </div>
            <div className="sheet-b">
              <div className="blk">
                <span className="blk-t">Nhóm hàng</span>
                <nav className="cats" aria-label="Nhóm hàng">
                  {nav.categories.map((category) => (
                    <div key={category.id}>
                      <Link href={`/danh-muc/${category.slug}`}>
                        {category.name}
                        <small>{category.productCount}</small>
                      </Link>
                      {category.children.map((child) => (
                        <Link key={child.id} className="sub" href={`/danh-muc/${child.slug}`}>
                          {child.name}
                          <small>{child.productCount}</small>
                        </Link>
                      ))}
                    </div>
                  ))}
                </nav>
              </div>
              {nav.brands.length > 0 && (
                <div className="blk">
                  <span className="blk-t">Thương hiệu</span>
                  <nav className="cats" aria-label="Thương hiệu">
                    {nav.brands.map((brand) => (
                      <Link key={brand.slug} href={`/thuong-hieu/${brand.slug}`}>
                        {brand.name}
                        <small>{brand.productCount}</small>
                      </Link>
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
