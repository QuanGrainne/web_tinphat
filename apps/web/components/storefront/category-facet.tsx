import Link from "next/link";

interface CategoryFacetProps {
  categories: { name: string; slug: string; count: number }[];
  activeSlug: string | undefined;
  total: number;
  /** href for a category (undefined = all). */
  hrefFor: (categorySlug: string | undefined) => string;
}

/** Brand page filter column / "Lọc sản phẩm" sheet: pick one category (plain links). */
export function CategoryFacet({ categories, activeSlug, total, hrefFor }: CategoryFacetProps) {
  return (
    <div className="sheet" id="filter" aria-label="Bộ lọc">
      <a className="scrim" href="#x" aria-label="Đóng" />
      <div className="panel">
        <div className="sheet-h">
          <span>Lọc sản phẩm</span>
          <a href="#x" aria-label="Đóng">
            <i className="i i-x" aria-hidden="true" />
          </a>
        </div>
        <div className="sheet-b">
          <div className="blk">
            <span className="blk-t">Danh mục</span>
            <nav className="cats" aria-label="Danh mục">
              <Link
                href={hrefFor(undefined)}
                prefetch={false}
                className={activeSlug === undefined ? "on" : undefined}
                aria-current={activeSlug === undefined ? "true" : undefined}
              >
                Tất cả
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={hrefFor(category.slug)}
                  prefetch={false}
                  className={category.slug === activeSlug ? "on" : undefined}
                  aria-current={category.slug === activeSlug ? "true" : undefined}
                >
                  {category.name}
                  <small>{category.count}</small>
                </Link>
              ))}
            </nav>
          </div>
        </div>
        <div className="sheet-f">
          <Link className="btn" href={hrefFor(undefined)}>
            Xóa lọc
          </Link>
          <a className="btn btn-pri" href="#x">
            Xem {total} sản phẩm
          </a>
        </div>
      </div>
    </div>
  );
}
