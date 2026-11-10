interface CategoryFacetProps {
  categories: { name: string; slug: string; count: number }[];
  activeSlug: string | undefined;
  total: number;
  /** href for a category (undefined = all). */
  hrefFor: (categorySlug: string | undefined) => string;
}

/** Brand page filter column / "Lọc sản phẩm" sheet: pick one category (plain links). */
export function CategoryFacet({
  categories,
  activeSlug,
  total,
  hrefFor,
}: CategoryFacetProps) {
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
              <a
                href={hrefFor(undefined)}
                className={activeSlug === undefined ? "on" : undefined}
                aria-current={activeSlug === undefined ? "true" : undefined}
              >
                Tất cả
              </a>
              {categories.map((category) => (
                <a
                  key={category.slug}
                  href={hrefFor(category.slug)}
                  className={category.slug === activeSlug ? "on" : undefined}
                  aria-current={
                    category.slug === activeSlug ? "true" : undefined
                  }
                >
                  {category.name}
                  <small>{category.count}</small>
                </a>
              ))}
            </nav>
          </div>
        </div>
        <div className="sheet-f">
          <a className="btn" href={hrefFor(undefined)}>
            Xóa lọc
          </a>
          <a className="btn btn-pri" href="#x">
            Xem {total} sản phẩm
          </a>
        </div>
      </div>
    </div>
  );
}
