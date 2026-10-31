import { SORTS, type SortValue } from "./listing-url";

interface ListingSortProps {
  total: number;
  sort: SortValue;
  hrefFor: (sort: SortValue) => string;
}

/** Toolbar: mobile "Lọc sản phẩm" / "Sắp xếp" buttons (CSS :target sheets) and the desktop sort chips. */
export function ListingSort({ total, sort, hrefFor }: ListingSortProps) {
  return (
    <div className="toolbar">
      <a className="tb-btn" href="#filter">
        <i className="i i-sliders" aria-hidden="true" />
        Lọc sản phẩm
      </a>
      <a className="tb-btn" href="#sort">
        <i className="i i-sort" aria-hidden="true" />
        Sắp xếp
      </a>
      <div className="sheet" id="sort" aria-label="Sắp xếp">
        <a className="scrim" href="#x" aria-label="Đóng" />
        <div className="panel">
          <div className="sheet-h">
            <span>Sắp xếp</span>
            <a href="#x" aria-label="Đóng">
              <i className="i i-x" aria-hidden="true" />
            </a>
          </div>
          <div className="sheet-b">
            <div className="sort-l">
              <span className="lbl">Xếp theo:</span>
              {SORTS.map((s) => (
                <a
                  key={s.value}
                  href={hrefFor(s.value)}
                  className={s.value === sort ? "on" : undefined}
                  aria-current={s.value === sort ? "true" : undefined}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
      <span className="count">{total} sản phẩm</span>
    </div>
  );
}
