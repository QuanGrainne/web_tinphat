import type { BankTransactionRow, HistoryEntry, OrderStatus, PaymentMethod, QuoteStatus } from "@/lib/api/types";

export type RequestKind = "ORDER" | "QUOTE";
export type BadgeTone = "blue" | "green" | "orange" | "grey" | "red";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PAID: "Đã nhận tiền",
  ENTERED_KIOTVIET: "Đã nhập KiotViet",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Hủy",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  NEW: "Mới",
  QUOTED: "Đã báo giá",
  WON: "Chốt",
  CANCELLED: "Hủy",
};

const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  PENDING: "orange",
  CONFIRMED: "green",
  PAID: "green",
  ENTERED_KIOTVIET: "blue",
  SHIPPING: "blue",
  COMPLETED: "grey",
  CANCELLED: "red",
};

const QUOTE_STATUS_TONES: Record<QuoteStatus, BadgeTone> = {
  NEW: "blue",
  QUOTED: "orange",
  WON: "green",
  CANCELLED: "red",
};

/** Statuses in flow order (the CANCELLED branch last). */
export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];
export const QUOTE_STATUSES = Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[];

/** Statuses a list filter may use for a kind; both kinds merged (CANCELLED once) when the kind is open. */
export function statusesForKind(kind?: RequestKind): string[] {
  if (kind === "ORDER") return [...ORDER_STATUSES];
  if (kind === "QUOTE") return [...QUOTE_STATUSES];
  return [...QUOTE_STATUSES.filter((s) => s !== "CANCELLED"), ...ORDER_STATUSES];
}

export function statusLabel(kind: RequestKind, status: string): string {
  const table: Record<string, string> = kind === "ORDER" ? ORDER_STATUS_LABELS : QUOTE_STATUS_LABELS;
  return table[status] ?? status;
}

export function statusTone(kind: RequestKind, status: string): BadgeTone {
  const table: Record<string, BadgeTone> = kind === "ORDER" ? ORDER_STATUS_TONES : QUOTE_STATUS_TONES;
  return table[status] ?? "grey";
}

/** Label for any status string regardless of kind (order labels win; CANCELLED is "Hủy" in both). */
export function anyStatusLabel(status: string): string {
  return (ORDER_STATUS_LABELS as Record<string, string>)[status] ?? (QUOTE_STATUS_LABELS as Record<string, string>)[status] ?? status;
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  COD: "COD",
  BANK_TRANSFER: "Chuyển khoản",
};

/** Quotes have no payment method: the list shows "Báo giá" in that column. */
export function paymentLabel(method: PaymentMethod | null): string {
  return method ? PAYMENT_LABELS[method] : "Báo giá";
}

const COD_FLOW: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"];
const BANK_FLOW: readonly OrderStatus[] = ["PENDING", "CONFIRMED", "PAID", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"];
const QUOTE_FLOW: readonly QuoteStatus[] = ["NEW", "QUOTED", "WON"];

export interface OrderStep {
  status: OrderStatus;
  label: string;
}

/** Steps of the happy path: transfer orders add "Đã nhận tiền" after "Đã xác nhận". */
export function orderSteps(method: PaymentMethod): OrderStep[] {
  const flow = method === "BANK_TRANSFER" ? BANK_FLOW : COD_FLOW;
  return flow.map((status) => ({ status, label: ORDER_STATUS_LABELS[status] }));
}

/** Index of the status in the step list; -1 for CANCELLED or a status outside the flow. */
export function currentStepIndex(method: PaymentMethod, status: OrderStatus): number {
  return orderSteps(method).findIndex((s) => s.status === status);
}

export type StepState = "done" | "now" | "todo";
export interface StepView {
  key: string;
  label: string;
  state: StepState;
}

function stepStates(keys: readonly string[], labels: (key: string) => string, index: number, finished: boolean): StepView[] {
  return keys.map((key, i) => ({
    key,
    label: labels(key),
    state: index < 0 ? "todo" : finished || i < index ? "done" : i === index ? "now" : "todo",
  }));
}

/** Step bar for an order: completed steps are "done", the current one "now"; a cancelled order has none lit. */
export function orderStepStates(method: PaymentMethod, status: OrderStatus): StepView[] {
  const steps = orderSteps(method);
  return stepStates(
    steps.map((s) => s.status),
    (k) => ORDER_STATUS_LABELS[k as OrderStatus],
    currentStepIndex(method, status),
    status === "COMPLETED",
  );
}

export function quoteStepStates(status: QuoteStatus): StepView[] {
  return stepStates(QUOTE_FLOW, (k) => QUOTE_STATUS_LABELS[k as QuoteStatus], QUOTE_FLOW.indexOf(status), status === "WON");
}

export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Xác nhận đơn",
  PAID: "Đánh dấu đã nhận tiền",
  ENTERED_KIOTVIET: "Đánh dấu đã nhập KiotViet",
  SHIPPING: "Đánh dấu đang giao",
  COMPLETED: "Hoàn tất đơn",
  CANCELLED: "Hủy đơn",
};

export const QUOTE_ACTION_LABELS: Record<QuoteStatus, string> = {
  NEW: "Mới",
  QUOTED: "Đánh dấu đã báo giá",
  WON: "Chốt báo giá",
  CANCELLED: "Hủy",
};

export const PAID_VIA_LABELS = {
  MANUAL: "Nhập tay",
  BANK_WEBHOOK: "Tự động (ngân hàng)",
} as const;

export function paidViaLabel(via: "MANUAL" | "BANK_WEBHOOK" | null): string {
  return via ? PAID_VIA_LABELS[via] : "-";
}

export const BANK_REVIEW_REASON_LABELS: Record<string, string> = {
  NO_CODE: "Không thấy mã đơn",
  MULTIPLE_CODES: "Nhiều mã đơn",
  UNKNOWN_CODE: "Mã đơn không tồn tại",
  NOT_BANK_TRANSFER: "Đơn không chuyển khoản",
  NOT_CONFIRMED: "Đơn chưa xác nhận",
  ALREADY_PAID: "Đơn đã nhận tiền",
  AMOUNT_MISMATCH: "Lệch số tiền",
  WRONG_ACCOUNT: "Sai tài khoản",
  OUT_WITH_CODE: "Tiền ra có mã đơn",
};

export function bankReviewReasonLabel(reason: string | null): string {
  if (!reason) return "-";
  return BANK_REVIEW_REASON_LABELS[reason] ?? reason;
}

export const BANK_TX_STATUS_LABELS: Record<BankTransactionRow["status"], string> = {
  RECEIVED: "Chưa xử lý",
  MATCHED: "Đã khớp",
  REVIEW: "Cần duyệt",
  IGNORED: "Đã bỏ qua",
};

export const BANK_TX_STATUS_TONES: Record<BankTransactionRow["status"], BadgeTone> = {
  RECEIVED: "grey",
  MATCHED: "green",
  REVIEW: "orange",
  IGNORED: "grey",
};

const BANK_WEBHOOK_ACTOR = "BANK_WEBHOOK";

export function actorLabel(actor: string): string {
  return actor === BANK_WEBHOOK_ACTOR ? PAID_VIA_LABELS.BANK_WEBHOOK : actor;
}

const HISTORY_ACTION_LABELS: Record<string, string> = {
  ORDER_CREATED: "Khách đặt hàng",
  QUOTE_CREATED: "Khách gửi yêu cầu báo giá",
  ORDER_STATUS: "Đổi trạng thái",
  QUOTE_STATUS: "Đổi trạng thái",
  BANK_TX_LINK: "Gắn giao dịch ngân hàng",
  BANK_TX_DISMISS: "Bỏ qua giao dịch ngân hàng",
};

/** One line for the history list: "Đổi trạng thái: Chờ xác nhận → Đã xác nhận". Unknown action codes are shown as they are. */
export function historyText(kind: RequestKind, entry: Pick<HistoryEntry, "action" | "from" | "to">): string {
  const action = HISTORY_ACTION_LABELS[entry.action] ?? entry.action;
  if (entry.from && entry.to) return `${action}: ${statusLabel(kind, entry.from)} → ${statusLabel(kind, entry.to)}`;
  if (entry.to) return `${action}: ${statusLabel(kind, entry.to)}`;
  return action;
}
