import { formatNumber } from "@/lib/format/money";

/**
 * Display-only price maths for the product editor while the owner types.
 * The server recomputes every figure on save and its warnings are authoritative.
 */

export interface PriceRowInput {
  unitName: string;
  conversion: number | null | undefined;
  price: number | null | undefined;
  isBase: boolean;
}

export interface PriceMismatchWarning {
  /** Index of the offending row in the input list. */
  index: number;
  unitName: string;
  /** Signed deviation in percent, e.g. 3.19 for +3,2%. */
  deviationPct: number;
  /** basePrice x conversion. */
  expectedPrice: number;
  /** "Giá Thùng lệch +3,2% so với 80 × giá Gói" */
  message: string;
}

/** round(price / conversion), HALF_UP, in integer arithmetic. Null when either input is missing or invalid. */
export function perBaseUnit(price: number | null | undefined, conversion: number | null | undefined): number | null {
  if (price == null || conversion == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(conversion) || price < 0 || conversion < 1) return null;
  return Math.floor((2 * price + conversion) / (2 * conversion));
}

/** (pack - base x conversion) / (base x conversion) x 100. Null when the base price is missing or zero. */
export function packDeviationPct(
  basePrice: number | null | undefined,
  conversion: number | null | undefined,
  packPrice: number | null | undefined,
): number | null {
  if (basePrice == null || conversion == null || packPrice == null) return null;
  const expected = basePrice * conversion;
  if (!Number.isFinite(expected) || expected <= 0) return null;
  return ((packPrice - expected) / expected) * 100;
}

/**
 * Strict ">" in both directions: |dev| > threshold. Compared in integers (threshold in thousandths of a percent)
 * so a deviation of exactly the threshold never trips on floating point noise.
 */
export function isPriceMismatch(
  basePrice: number | null | undefined,
  conversion: number | null | undefined,
  packPrice: number | null | undefined,
  thresholdPct: number,
): boolean {
  if (basePrice == null || conversion == null || packPrice == null) return false;
  const expected = basePrice * conversion;
  if (!Number.isFinite(expected) || expected <= 0 || !Number.isFinite(thresholdPct)) return false;
  const thousandths = Math.round(thresholdPct * 1000);
  return Math.abs(packPrice - expected) * 100_000 > thousandths * expected;
}

/** Signed percent with a decimal comma: 3.19 -> "+3,2%", -2.5 -> "-2,5%", 0 -> "0,0%". */
export function formatSignedPct(p: number): string {
  const rounded = Math.round(p * 10) / 10;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(p).toFixed(1).replace(".", ",")}%`;
}

/** Mismatch warnings for every non-base row against the base row's price. */
export function priceMismatchWarnings(rows: readonly PriceRowInput[], thresholdPct: number): PriceMismatchWarning[] {
  const base = rows.find((r) => r.isBase);
  const basePrice = base?.price;
  if (!base || basePrice == null || basePrice <= 0) return [];
  const out: PriceMismatchWarning[] = [];
  rows.forEach((row, index) => {
    if (row.isBase || row.conversion == null || row.conversion < 1 || row.price == null) return;
    if (!isPriceMismatch(basePrice, row.conversion, row.price, thresholdPct)) return;
    const deviationPct = packDeviationPct(basePrice, row.conversion, row.price);
    if (deviationPct == null) return;
    const unit = row.unitName.trim() || "quy cách";
    const baseUnit = base.unitName.trim() || "cơ bản";
    out.push({
      index,
      unitName: unit,
      deviationPct,
      expectedPrice: basePrice * row.conversion,
      message: `Giá ${unit} lệch ${formatSignedPct(deviationPct)} so với ${formatNumber(row.conversion)} × giá ${baseUnit}`,
    });
  });
  return out;
}
