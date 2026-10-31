import type { PricedCart } from "@/lib/api/types";

export interface PriceChange {
  skuId: number;
  name: string;
  unitName: string;
  kind: "price" | "unavailable" | "unorderable";
  from: number | null;
  to: number | null;
}

export interface PriceDiff {
  changes: PriceChange[];
  totalFrom: number | null;
  totalTo: number;
}

/** What differs between the basket the customer saw and the one the API just priced (after a 409). */
export function diffPricedCarts(prev: PricedCart | null, next: PricedCart): PriceDiff {
  const before = new Map(prev?.lines.map((l) => [l.skuId, l]) ?? []);
  const changes: PriceChange[] = [];
  for (const line of next.lines) {
    const old = before.get(line.skuId);
    const base = { skuId: line.skuId, name: line.productName || old?.productName || "", unitName: line.unitName || old?.unitName || "" };
    if (line.unavailable) {
      if (!old?.unavailable) changes.push({ ...base, kind: "unavailable", from: old?.unitPrice ?? null, to: null });
    } else if (!line.orderable) {
      if (old?.orderable !== false) changes.push({ ...base, kind: "unorderable", from: old?.unitPrice ?? null, to: null });
    } else if (old && !old.unavailable && old.unitPrice !== line.unitPrice) {
      changes.push({ ...base, kind: "price", from: old.unitPrice, to: line.unitPrice });
    }
  }
  return { changes, totalFrom: prev?.total ?? null, totalTo: next.total };
}
