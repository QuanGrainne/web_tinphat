"use client";

import type { RequestRow } from "@/lib/api/types";
import { OrderDetail } from "./order-detail";
import { QuoteDetail } from "./quote-detail";

export function RequestDetail({ row }: { row: RequestRow }) {
  return row.kind === "ORDER" ? <OrderDetail row={row} /> : <QuoteDetail row={row} />;
}
