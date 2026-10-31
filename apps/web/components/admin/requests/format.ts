import dayjs from "dayjs";
import { formatNumber } from "@/lib/format/money";

/** `29/10/2026 17:40` in the browser's time zone; "-" when empty or unparseable. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = dayjs(iso);
  return d.isValid() ? d.format("DD/MM/YYYY HH:mm") : "-";
}

/** `0912 345 678` for 10-digit numbers, otherwise the value as stored. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  return raw;
}

export function telHref(raw: string): string {
  return `tel:${raw.replace(/[^\d+]/g, "")}`;
}

/** antd InputNumber formatter: 428500 -> "428.500". */
export function moneyInputFormatter(value: number | undefined): string {
  return value === undefined || Number.isNaN(value) ? "" : formatNumber(value);
}

/**
 * antd InputNumber parser: "428.500" -> "428500". InputNumber accepts the digit string and turns "" into an
 * empty value, so the cast only satisfies the generic parameter.
 */
export function moneyInputParser(display: string | undefined): number {
  return (display ?? "").replace(/\D/g, "") as unknown as number;
}
