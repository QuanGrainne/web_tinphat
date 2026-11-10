"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CatalogImage } from "@/components/catalog-image";
import type { NavCategory } from "@/lib/api/types";

/** "Danh mục sản phẩm" in the main menu bar: opens on hover, click or keyboard, four categories per row. */
export function CategoryDropdown({
  categories,
}: {
  categories: NavCategory[];
}) {
  const pathname = usePathname();
  // keyed by path so every navigation starts with the menu closed
  return (
    <Dropdown
      key={pathname}
      categories={categories}
      active={pathname.startsWith("/danh-muc/")}
    />
  );
}

function Dropdown({
  categories,
  active,
}: {
  categories: NavCategory[];
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  // a short delay, so moving the mouse diagonally into the panel does not close it
  const closeSoon = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => cancelClose, []);

  return (
    <div
      ref={root}
      className={open ? "tp-dd open" : "tp-dd"}
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={closeSoon}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        className={active ? "tp-dd-btn on" : "tp-dd-btn"}
        aria-expanded={open}
        aria-controls="tp-dd-panel"
        onClick={() => setOpen(!open)}
      >
        <i className="i i-grid" aria-hidden="true" />
        Danh mục sản phẩm
        <i className="i i-down tp-dd-caret" aria-hidden="true" />
      </button>
      <div id="tp-dd-panel" className="tp-dd-panel" hidden={!open}>
        <div className="tp-dd-head">
          <b>Danh mục sản phẩm</b>
          <Link href="/san-pham" prefetch={false}>
            Xem tất cả sản phẩm →
          </Link>
        </div>
        <ul className="tp-dd-grid">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                className="tp-dd-item"
                href={`/danh-muc/${category.slug}`}
                prefetch={false}
              >
                <span className="tp-dd-img">
                  {category.imageUrl ? (
                    <CatalogImage
                      src={category.imageUrl}
                      width={56}
                      height={56}
                      sizes="56px"
                    />
                  ) : (
                    <i className="i i-image" aria-hidden="true" />
                  )}
                </span>
                <span>
                  <b>{category.name}</b>
                  <small>{category.productCount} sản phẩm</small>
                </span>
              </Link>
              {category.children.length > 0 && (
                <ul className="tp-dd-sub">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <Link href={`/danh-muc/${child.slug}`} prefetch={false}>
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
