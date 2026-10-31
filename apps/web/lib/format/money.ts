/** Group digits with dots: 428500 -> "428.500". Deterministic on server and client (no Intl). */
export function formatNumber(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  return sign + String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** VND with suffix: 428500 -> "428.500đ". */
export function formatVnd(n: number): string {
  return `${formatNumber(n)}đ`;
}

/** Percent with decimal comma: 1.9 -> "1,9%". */
export function formatPct(p: number): string {
  return `${p.toFixed(1).replace(".", ",")}%`;
}
