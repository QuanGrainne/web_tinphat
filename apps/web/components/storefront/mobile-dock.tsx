"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Nav } from "@/lib/api/types";

/** Bottom dock (mobile) plus the Danh mục bottom sheet it opens (CSS :target, no client state). */
export function MobileDock({ nav }: { nav: Nav | null }) {
  const pathname = usePathname();
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
        <Link href="/gioi-thieu" className={cls(pathname === "/gioi-thieu")}>
          <i className="i i-doc" aria-hidden="true" />
          Giới thiệu
        </Link>
        <Link href="/lien-he" className={cls(pathname === "/lien-he")}>
          <i className="i i-phone" aria-hidden="true" />
          Liên hệ
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
                <span className="blk-t">Danh mục</span>
                <nav className="cats" aria-label="Danh mục sản phẩm">
                  {nav.categories.map((category) => (
                    <div key={category.id}>
                      <a href={`/danh-muc/${category.slug}`}>
                        {category.name}
                        <small>{category.productCount}</small>
                      </a>
                      {category.children.map((child) => (
                        <a key={child.id} className="sub" href={`/danh-muc/${child.slug}`}>
                          {child.name}
                          <small>{child.productCount}</small>
                        </a>
                      ))}
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
