"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Nav } from "@/lib/api/types";

/** DANH MỤC button with the category / brand mega menu (desktop). Closes on navigation, outside click and Escape. */
export function CategoryMenu({ nav }: { nav: Nav }) {
  const pathname = usePathname();
  // Remembering the path the menu was opened on closes it automatically after navigation.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenedOn(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedOn(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="catwrap" ref={rootRef}>
      <button
        type="button"
        className="catbtn"
        aria-expanded={open}
        aria-controls="cat-panel"
        onClick={() => setOpenedOn(open ? null : pathname)}
      >
        <i className="i i-menu" aria-hidden="true" />
        Danh mục
      </button>
      {open && (
        <div id="cat-panel" className="catpanel" onClick={() => setOpenedOn(null)}>
          {nav.categories.map((category) => (
            <div key={category.id}>
              <h3>
                <Link href={`/danh-muc/${category.slug}`}>{category.name}</Link>
              </h3>
              <ul>
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/danh-muc/${child.slug}`}>
                      {child.name}
                      <small>{child.productCount}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {nav.brands.length > 0 && (
            <div>
              <h3>Thương hiệu</h3>
              <ul>
                {nav.brands.map((brand) => (
                  <li key={brand.slug}>
                    <Link href={`/thuong-hieu/${brand.slug}`}>
                      {brand.name}
                      <small>{brand.productCount}</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
