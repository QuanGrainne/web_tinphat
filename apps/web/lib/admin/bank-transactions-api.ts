import { adminFetch } from "@/lib/admin/api-client";
import { toQueryString, REQUEST_PAGE_SIZE } from "@/lib/admin/requests-api";
import type { BankTransactionRow, Page } from "@/lib/api/types";

export type BankTxFilter = "REVIEW" | "MATCHED" | "IGNORED";

export const bankTxKeys = {
  all: ["admin", "bank-transactions"] as const,
  list: (status: BankTxFilter, page: number) => [...bankTxKeys.all, "list", status, page] as const,
};

export function bankTransactionsPath(status: BankTxFilter, page: number, size: number = REQUEST_PAGE_SIZE): string {
  return `/api/admin/bank-transactions${toQueryString({ status, page, size })}`;
}

export const fetchBankTransactions = (status: BankTxFilter, page: number) =>
  adminFetch<Page<BankTransactionRow>>(bankTransactionsPath(status, page));

export interface LinkBankTransaction {
  orderId: number;
  markPaid: boolean;
  note?: string;
}

export const linkBankTransaction = (id: number, body: LinkBankTransaction) =>
  adminFetch<BankTransactionRow>(`/api/admin/bank-transactions/${id}/link`, { method: "POST", body });

export const dismissBankTransaction = (id: number, note: string) =>
  adminFetch<BankTransactionRow>(`/api/admin/bank-transactions/${id}/dismiss`, { method: "POST", body: { note } });
