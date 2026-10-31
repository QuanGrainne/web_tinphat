import type { Metadata } from "next";
import { RequestsScreen } from "@/components/admin/requests/requests-screen";
import { parseRequestFilters } from "@/lib/admin/requests-api";

export const metadata: Metadata = { title: "Báo giá & đơn hàng" };

type SearchParams = Record<string, string | string[] | undefined>;

/** Filters and the bank tab can be opened from a link (`?kind=QUOTE&status=NEW`, `?tab=bank`), e.g. from the bell. */
export default async function RequestsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <RequestsScreen initialFilters={parseRequestFilters(params)} initialTab={params.tab === "bank" ? "bank" : "requests"} />;
}
