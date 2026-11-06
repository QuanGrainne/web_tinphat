"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Nav } from "@/lib/api/types";

/** DANH MỤC button with the category mega menu (desktop). Closes on navigation, outside click and Escape. */
export function CategoryMenu({ nav }: { nav: Nav }) {
  const pathname = usePathname();
  // Keyed by path so every navigation starts with the menu closed.
  return <CategoryMenuPanel key={pathname} nav={nav} />;
}

function CategoryMenuPanel({ nav }: { nav: Nav }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
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
        onClick={() => setOpen(!open)}
      >
        <i className="i i-menu" aria-hidden="true" />
        Danh mục
      </button>
      {open && (
        <div id="cat-panel" className="catpanel" onClick={() => setOpen(false)}>
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
        </div>
      )}
    </div>
  );
}
