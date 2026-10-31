import Link from "next/link";
import { pageWindow } from "./listing-url";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  hrefFor: (page: number) => string;
}

/** Plain-link pagination (server rendered, crawlable). */
export function Pagination({ page, pageSize, total, hrefFor }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / Math.max(pageSize, 1)));
  if (pages <= 1) return null;
  return (
    <nav className="pg" aria-label="Phân trang">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} rel="prev" aria-label="Trang trước">
          ‹
        </Link>
      )}
      {pageWindow(page, pages).map((n, index) =>
        n === null ? (
          <span key={`gap-${index}`} className="gap" aria-hidden="true">
            …
          </span>
        ) : n === page ? (
          <span key={n} aria-current="page" aria-label={`Trang ${n}`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={hrefFor(n)} aria-label={`Trang ${n}`}>
            {n}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={hrefFor(page + 1)} rel="next" aria-label="Trang sau">
          ›
        </Link>
      )}
    </nav>
  );
}
