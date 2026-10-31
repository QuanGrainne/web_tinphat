"use client";

import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DEFAULT_SORT, listingHref, type SortValue } from "./listing-url";

export interface BrandFacet {
  name: string;
  slug: string;
  count: number;
}

interface BrandFilterProps {
  /** Listing path the form submits to (GET), e.g. /danh-muc/giay. */
  action: string;
  sort: SortValue;
  brands: BrandFacet[];
  selected: string[];
  total: number;
  /** Server-rendered extra blocks (category tree) shown under the brand block. */
  children?: ReactNode;
}

/**
 * Filter column (desktop) / "Lọc sản phẩm" bottom sheet (mobile). A GET form: brand checkboxes become repeated
 * `brand` params. Desktop applies on every change; mobile applies with the footer button.
 * Mount it with a key derived from `selected` so it resets when the URL changes.
 */
export function BrandFilter({ action, sort, brands, selected, total, children }: BrandFilterProps) {
  const router = useRouter();
  const [checked, setChecked] = useState<string[]>(selected);

  function toggle(slug: string) {
    const next = checked.includes(slug) ? checked.filter((s) => s !== slug) : [...checked, slug];
    setChecked(next);
    if (window.matchMedia("(min-width: 960px)").matches) {
      router.push(listingHref(action, { brand: next, sort }));
    }
  }

  // Every product has at most one brand, so the selected facet counts add up exactly.
  const counts = new Map(brands.map((b) => [b.slug, b.count]));
  const count = checked.length > 0 ? checked.reduce((sum, slug) => sum + (counts.get(slug) ?? 0), 0) : selected.length === 0 ? total : null;

  return (
    <div className="sheet" id="filter" aria-label="Bộ lọc">
      <a className="scrim" href="#x" aria-label="Đóng" />
      <Form className="panel" action={action}>
        <div className="sheet-h">
          <span>Lọc sản phẩm</span>
          <a href="#x" aria-label="Đóng">
            <i className="i i-x" aria-hidden="true" />
          </a>
        </div>
        <div className="sheet-b">
          {sort !== DEFAULT_SORT && <input type="hidden" name="sort" value={sort} />}
          {brands.length > 0 && (
            <div className="blk">
              <span className="blk-t">Thương hiệu</span>
              {brands.map((brand) => (
                <label key={brand.slug} className="chk">
                  <input
                    type="checkbox"
                    name="brand"
                    value={brand.slug}
                    checked={checked.includes(brand.slug)}
                    onChange={() => toggle(brand.slug)}
                  />
                  {brand.name}
                  <small>{brand.count}</small>
                </label>
              ))}
            </div>
          )}
          {children}
        </div>
        <div className="sheet-f">
          <Link className="btn" href={listingHref(action, { sort })}>
            Xóa lọc
          </Link>
          <button type="submit" className="btn btn-pri">
            {count !== null ? `Xem ${count} sản phẩm` : "Xem sản phẩm"}
          </button>
        </div>
      </Form>
    </div>
  );
}
