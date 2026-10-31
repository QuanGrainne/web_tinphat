import type { AdminOrder, OrderStatus, OrderTransition, OrderTransitionField } from "@/lib/api/types";

/** What the transition dialog collects; only the fields that apply are sent. */
export interface TransitionValues {
  shippingFee: number | null;
  paidAmount: number | null;
  note: string;
  kiotvietOrderCode: string;
}

export type TransitionErrors = Partial<Record<OrderTransitionField, string>>;

type OrderForTransition = Pick<AdminOrder, "status" | "total" | "subtotal" | "discountTotal">;

export const KIOTVIET_CODE_MAX = 50;
export const NOTE_MAX = 500;

export function initialTransitionValues(order: Pick<AdminOrder, "total">): TransitionValues {
  return { shippingFee: 0, paidAmount: order.total, note: "", kiotvietOrderCode: "" };
}

/**
 * Fields the dialog shows: everything the server lists in `requires`, plus the ones the order rules always need for
 * that step (fee at confirm, amount and note at paid, KiotViet code, refund note when cancelling a paid order).
 */
export function transitionFields(
  order: Pick<AdminOrder, "status">,
  to: OrderStatus,
  requires: readonly OrderTransitionField[],
): OrderTransitionField[] {
  const fields = new Set<OrderTransitionField>(requires);
  if (to === "CONFIRMED") fields.add("shippingFee");
  if (to === "PAID") {
    fields.add("paidAmount");
    fields.add("note");
  }
  if (to === "ENTERED_KIOTVIET") fields.add("kiotvietOrderCode");
  if (to === "CANCELLED" && order.status === "PAID") fields.add("note");
  return (["shippingFee", "paidAmount", "kiotvietOrderCode", "note"] as const).filter((f) => fields.has(f));
}

/** subtotal - discount + fee: what the customer has to pay once the fee is set. */
export function totalWithShippingFee(order: Pick<AdminOrder, "subtotal" | "discountTotal">, fee: number | null): number {
  return order.subtotal - order.discountTotal + (fee ?? 0);
}

/** Received amount differs from the order total (needs a note). */
export function isPaidAmountMismatch(order: Pick<AdminOrder, "total">, paidAmount: number | null): boolean {
  return paidAmount !== null && paidAmount !== order.total;
}

export function isNoteRequired(order: OrderForTransition, to: OrderStatus, values: TransitionValues): boolean {
  if (to === "PAID") return isPaidAmountMismatch(order, values.paidAmount);
  if (to === "CANCELLED") return order.status === "PAID";
  return false;
}

function isWholeNumber(n: number | null): n is number {
  return n !== null && Number.isInteger(n);
}

export function validateTransition(
  order: OrderForTransition,
  to: OrderStatus,
  fields: readonly OrderTransitionField[],
  values: TransitionValues,
): TransitionErrors {
  const errors: TransitionErrors = {};
  if (fields.includes("shippingFee")) {
    if (values.shippingFee === null) errors.shippingFee = "Nhập phí giao hàng (nhập 0 nếu không thu).";
    else if (!isWholeNumber(values.shippingFee) || values.shippingFee < 0) errors.shippingFee = "Phí giao hàng phải là số nguyên từ 0 trở lên.";
  }
  if (fields.includes("paidAmount")) {
    if (values.paidAmount === null) errors.paidAmount = "Nhập số tiền đã nhận.";
    else if (!isWholeNumber(values.paidAmount) || values.paidAmount <= 0) errors.paidAmount = "Số tiền nhận phải lớn hơn 0.";
  }
  if (fields.includes("kiotvietOrderCode")) {
    const code = values.kiotvietOrderCode.trim();
    if (code === "") errors.kiotvietOrderCode = "Nhập mã đơn KiotViet.";
    else if (code.length > KIOTVIET_CODE_MAX) errors.kiotvietOrderCode = `Mã đơn KiotViet tối đa ${KIOTVIET_CODE_MAX} ký tự.`;
  }
  if (fields.includes("note")) {
    const note = values.note.trim();
    if (note === "" && isNoteRequired(order, to, values)) {
      errors.note = to === "CANCELLED" ? "Nhập ghi chú hoàn tiền cho khách." : "Nhập ghi chú giải thích lệch số tiền.";
    } else if (note.length > NOTE_MAX) {
      errors.note = `Ghi chú tối đa ${NOTE_MAX} ký tự.`;
    }
  }
  return errors;
}

/** Request body: `to` plus only the fields the dialog collected (blank note omitted, text trimmed). */
export function buildTransitionPayload(
  to: OrderStatus,
  fields: readonly OrderTransitionField[],
  values: TransitionValues,
): OrderTransition {
  const payload: OrderTransition = { to };
  if (fields.includes("shippingFee") && values.shippingFee !== null) payload.shippingFee = values.shippingFee;
  if (fields.includes("paidAmount") && values.paidAmount !== null) payload.paidAmount = values.paidAmount;
  if (fields.includes("kiotvietOrderCode")) payload.kiotvietOrderCode = values.kiotvietOrderCode.trim();
  if (fields.includes("note")) {
    const note = values.note.trim();
    if (note !== "") payload.note = note;
  }
  return payload;
}
