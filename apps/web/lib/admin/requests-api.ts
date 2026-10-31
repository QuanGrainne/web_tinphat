import { adminFetch } from "@/lib/admin/api-client";
import { statusesForKind, type RequestKind } from "@/lib/admin/order-labels";
import type {
  AdminOrder,
  AdminQuote,
  OrderTransition,
  PaymentMethod,
  QuoteStatus,
  RequestCounters,
  RequestList,
} from "@/lib/api/types";

export const REQUEST_PAGE_SIZE = 30;

/** List filters; an absent key means "all". */
export interface RequestFilters {
  kind?: RequestKind;
  status?: string;
  payment?: PaymentMethod;
  q?: string;
}

/** Query keys. The bell in the shell can share `requestKeys.counters()` so transitions refresh it. */
export const requestKeys = {
  all: ["admin", "requests"] as const,
  lists: () => [...requestKeys.all, "list"] as const,
  list: (filters: RequestFilters, page: number) => [...requestKeys.lists(), filters, page] as const,
  counters: () => [...requestKeys.all, "counters"] as const,
  order: (id: number) => [...requestKeys.all, "order", id] as const,
  quote: (id: number) => [...requestKeys.all, "quote", id] as const,
  orderSearch: (q: string) => [...requestKeys.all, "order-search", q] as const,
};

/** `?a=1&b=2` from the defined, non-blank params; "" when there are none. */
export function toQueryString(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text !== "") sp.set(key, text);
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export function requestListPath(filters: RequestFilters, page: number, size: number = REQUEST_PAGE_SIZE): string {
  return `/api/admin/requests${toQueryString({
    kind: filters.kind,
    status: filters.status,
    payment: filters.payment,
    q: filters.q,
    page,
    size,
  })}`;
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Initial filters from the page URL (links from the bell use the same names as the API). Unknown values are dropped. */
export function parseRequestFilters(params: SearchParams): RequestFilters {
  const out: RequestFilters = {};
  const kind = firstValue(params.kind);
  if (kind === "ORDER" || kind === "QUOTE") out.kind = kind;
  const status = firstValue(params.status);
  if (status && statusesForKind(out.kind).includes(status)) out.status = status;
  const payment = firstValue(params.payment);
  if (out.kind !== "QUOTE" && (payment === "COD" || payment === "BANK_TRANSFER")) out.payment = payment;
  const q = firstValue(params.q)?.trim();
  if (q) out.q = q.slice(0, 100);
  return out;
}

export const fetchRequestList = (filters: RequestFilters, page: number) =>
  adminFetch<RequestList>(requestListPath(filters, page));

export const fetchRequestCounters = () => adminFetch<RequestCounters>("/api/admin/requests/counters");

export const fetchOrder = (id: number) => adminFetch<AdminOrder>(`/api/admin/orders/${id}`);

export const fetchQuote = (id: number) => adminFetch<AdminQuote>(`/api/admin/quotes/${id}`);

export const transitionOrder = (id: number, body: OrderTransition) =>
  adminFetch<AdminOrder>(`/api/admin/orders/${id}/transition`, { method: "POST", body });

export const transitionQuote = (id: number, body: { to: QuoteStatus; note?: string }) =>
  adminFetch<AdminQuote>(`/api/admin/quotes/${id}/transition`, { method: "POST", body });

export function internalNotePath(kind: "orders" | "quotes", id: number): string {
  return `/api/admin/requests/${kind}/${id}/internal-note`;
}

export const saveInternalNote = (kind: "orders" | "quotes", id: number, internalNote: string) =>
  adminFetch<void>(internalNotePath(kind, id), { method: "PUT", body: { internalNote } });

/** Order lookup for the bank-transaction link dialog (code, name or phone). */
export const searchOrders = (q: string) => adminFetch<RequestList>(requestListPath({ kind: "ORDER", q }, 1, 10));
