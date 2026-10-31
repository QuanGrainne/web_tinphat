import type { OrderStatus, PaymentMethod } from "@/lib/api/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  PAID: "Đã nhận tiền",
  ENTERED_KIOTVIET: "Đã nhập KiotViet",
  SHIPPING: "Đang giao",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const COD_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"];
const BANK_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PAID", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"];

export type StepState = "done" | "now" | "todo";
export interface StepView {
  status: OrderStatus;
  label: string;
  state: StepState;
}

/** Steps shown on the order page. Cancelled orders have no steps (the page shows "Đã hủy" instead). */
export function orderSteps(method: PaymentMethod, status: OrderStatus): StepView[] {
  if (status === "CANCELLED") return [];
  const flow = method === "BANK_TRANSFER" ? BANK_FLOW : COD_FLOW;
  const found = flow.indexOf(status);
  const current = found < 0 ? 0 : found;
  return flow.map((s, i) => ({
    status: s,
    label: STATUS_LABEL[s],
    state: status === "COMPLETED" || i < current ? "done" : i === current ? "now" : "todo",
  }));
}

/** Statuses after which a bank transfer order counts as paid. */
const PAID_FLOW = new Set<OrderStatus>(["PAID", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"]);

export type BankBlockMode = "none" | "text" | "qr" | "paid";

/**
 * What the payment block shows for an order.
 * text = account number and transfer content only (amount not final yet); qr = confirmed total, VietQR plus text;
 * paid = money received. COD and cancelled orders show nothing.
 */
export function bankBlockMode(order: {
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  bank: unknown;
  qrAmount: number | null;
}): BankBlockMode {
  if (order.paymentMethod !== "BANK_TRANSFER" || order.status === "CANCELLED") return "none";
  if (PAID_FLOW.has(order.status)) return "paid";
  if (!order.bank) return "none";
  return order.status === "CONFIRMED" && order.qrAmount !== null && order.qrAmount > 0 ? "qr" : "text";
}
