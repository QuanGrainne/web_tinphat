/** Query handling for listing pages (category, brand, search): parsing and link building. */

export const SORTS = [
  { value: "name_asc", label: "Tên A-Z" },
  { value: "name_desc", label: "Tên Z-A" },
  { value: "price_asc", label: "Giá thấp đến cao" },
  { value: "price_desc", label: "Giá cao xuống thấp" },
] as const;

export type SortValue = (typeof SORTS)[number]["value"];
export const DEFAULT_SORT: SortValue = "name_asc";

export type RawParams = Record<string, string | string[] | undefined>;

export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value]).map((v) => v.trim()).filter(Boolean);
}

export function parseSort(value: string | undefined): SortValue {
  return SORTS.find((s) => s.value === value)?.value ?? DEFAULT_SORT;
}

export function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 10_000) : 1;
}

export interface ListingQuery {
  brand?: string[];
  category?: string;
  q?: string;
  sort?: SortValue;
  page?: number;
}

/** Link to a listing state; defaults (first page, A-Z) are left out so URLs stay canonical. */
export function listingHref(basePath: string, query: ListingQuery): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  query.brand?.forEach((b) => sp.append("brand", b));
  if (query.category) sp.set("category", query.category);
  if (query.sort && query.sort !== DEFAULT_SORT) sp.set("sort", query.sort);
  if (query.page && query.page > 1) sp.set("page", String(query.page));
  const s = sp.toString();
  return s ? `${basePath}?${s}` : basePath;
}

/** Page numbers to show: first, last, and a window around the current page (null = gap). */
export function pageWindow(page: number, pages: number): (number | null)[] {
  const keep = new Set<number>([1, pages, page - 1, page, page + 1]);
  const nums = [...keep].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
