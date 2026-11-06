import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { first, listingHref, parsePage, type RawParams } from "@/components/storefront/listing-url";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { contactHref, loadSettings } from "@/components/storefront/shell-data";
import { apiGet, qs } from "@/lib/api/server-fetch";
import type { SearchResult } from "@/lib/api/types";
import { pageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

const MIN_CHARS = 2;

type Props = { searchParams: Promise<RawParams> };

function readQuery(raw: RawParams): { q: string; page: number } {
  return { q: (first(raw.q) ?? "").trim().slice(0, 100), page: parsePage(first(raw.page)) };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = readQuery(await searchParams);
  return pageMetadata({ title: q ? `Tìm "${q}"` : "Tìm kiếm", path: "/tim-kiem", noindex: true });
}

export default async function SearchPage({ searchParams }: Props) {
  const { q, page } = readQuery(await searchParams);
  const trail = [
    { name: "Trang chủ", href: "/" },
    { name: "Tìm kiếm", href: "/tim-kiem" },
  ];

  if (q.length < MIN_CHARS) {
    return (
      <main className="wrap">
        <Breadcrumb trail={trail} />
        <h1 className="pg-t">Tìm kiếm</h1>
        <div className="empty">
          <b>Nhập ít nhất 2 ký tự</b>
          <p>Tìm theo tên sản phẩm hoặc mã hàng, có dấu hay không dấu đều được.</p>
        </div>
      </main>
    );
  }

  const [data, settings] = await Promise.all([
    apiGet<SearchResult>(`/api/public/search${qs({ q, page: page > 1 ? page : undefined })}`),
    loadSettings(),
  ]);

  return (
    <main className="wrap">
      <Breadcrumb trail={trail} />
      <h1 className="pg-t">Kết quả cho &ldquo;{q}&rdquo;</h1>
      <p className="muted" style={{ marginBottom: 12 }}>
        {data.total} sản phẩm
      </p>
      {data.items.length > 0 ? (
        <>
          <h2 className="sr">Danh sách sản phẩm</h2>
          <ProductGrid cards={data.items} variant="grid-4" contactHref={contactHref(settings)} />
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            hrefFor={(p) => listingHref("/tim-kiem", { q, page: p })}
          />
        </>
      ) : (
        <div className="empty">
          <b>Không tìm thấy sản phẩm</b>
          <p>Thử từ khóa ngắn hơn hoặc mã hàng.</p>
          <Link className="btn btn-pri" href="/">
            Về trang chủ
          </Link>
        </div>
      )}
    </main>
  );
}
