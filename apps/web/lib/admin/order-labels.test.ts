import { describe, expect, it } from "vitest";
import type { OrderStatus, QuoteStatus } from "@/lib/api/types";
import {
  BANK_REVIEW_REASON_LABELS,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  QUOTE_STATUSES,
  QUOTE_STATUS_LABELS,
  actorLabel,
  anyStatusLabel,
  bankReviewReasonLabel,
  currentStepIndex,
  historyText,
  orderStepStates,
  orderSteps,
  paidViaLabel,
  paymentLabel,
  quoteStepStates,
  statusLabel,
  statusTone,
  statusesForKind,
} from "./order-labels";

describe("status labels", () => {
  it("labels every order status in Vietnamese", () => {
    expect(ORDER_STATUS_LABELS).toEqual({
      PENDING: "Chờ xác nhận",
      CONFIRMED: "Đã xác nhận",
      PAID: "Đã nhận tiền",
      ENTERED_KIOTVIET: "Đã nhập KiotViet",
      SHIPPING: "Đang giao",
      COMPLETED: "Hoàn tất",
      CANCELLED: "Hủy",
    });
  });

  it("labels every quote status in Vietnamese", () => {
    expect(QUOTE_STATUS_LABELS).toEqual({ NEW: "Mới", QUOTED: "Đã báo giá", WON: "Chốt", CANCELLED: "Hủy" });
  });

  it("looks labels up by kind and passes unknown statuses through", () => {
    expect(statusLabel("ORDER", "PENDING")).toBe("Chờ xác nhận");
    expect(statusLabel("QUOTE", "NEW")).toBe("Mới");
    expect(statusLabel("QUOTE", "PENDING")).toBe("PENDING");
    expect(anyStatusLabel("WON")).toBe("Chốt");
    expect(anyStatusLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });

  it("keeps flow order in the status lists", () => {
    expect(ORDER_STATUSES).toEqual(["PENDING", "CONFIRMED", "PAID", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED", "CANCELLED"]);
    expect(QUOTE_STATUSES).toEqual(["NEW", "QUOTED", "WON", "CANCELLED"]);
  });

  it("offers filter statuses per kind, merged without a duplicate Hủy when the kind is open", () => {
    expect(statusesForKind("QUOTE")).toEqual(["NEW", "QUOTED", "WON", "CANCELLED"]);
    expect(statusesForKind("ORDER")).toHaveLength(7);
    const all = statusesForKind();
    expect(all).toHaveLength(10);
    expect(all.filter((s) => s === "CANCELLED")).toHaveLength(1);
  });
});

describe("badge tones", () => {
  it("colours orders like the wireframe", () => {
    expect(statusTone("ORDER", "PENDING")).toBe("orange");
    expect(statusTone("ORDER", "CONFIRMED")).toBe("green");
    expect(statusTone("ORDER", "SHIPPING")).toBe("blue");
    expect(statusTone("ORDER", "COMPLETED")).toBe("grey");
    expect(statusTone("ORDER", "CANCELLED")).toBe("red");
  });

  it("colours quotes like the wireframe", () => {
    expect(statusTone("QUOTE", "NEW")).toBe("blue");
    expect(statusTone("QUOTE", "QUOTED")).toBe("orange");
    expect(statusTone("QUOTE", "WON")).toBe("green");
    expect(statusTone("QUOTE", "CANCELLED")).toBe("red");
  });

  it("falls back to grey for an unknown status", () => {
    expect(statusTone("ORDER", "MYSTERY")).toBe("grey");
  });
});

describe("payment labels", () => {
  it("names the payment methods and quotes", () => {
    expect(paymentLabel("COD")).toBe("COD");
    expect(paymentLabel("BANK_TRANSFER")).toBe("Chuyển khoản");
    expect(paymentLabel(null)).toBe("Báo giá");
  });

  it("names how an order was paid", () => {
    expect(paidViaLabel("MANUAL")).toBe("Nhập tay");
    expect(paidViaLabel("BANK_WEBHOOK")).toBe("Tự động (ngân hàng)");
    expect(paidViaLabel(null)).toBe("-");
  });
});

describe("order steps", () => {
  it("skips the paid step for COD", () => {
    expect(orderSteps("COD").map((s) => s.label)).toEqual([
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đã nhập KiotViet",
      "Đang giao",
      "Hoàn tất",
    ]);
  });

  it("adds the paid step after confirmation for bank transfer", () => {
    expect(orderSteps("BANK_TRANSFER").map((s) => s.label)).toEqual([
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đã nhận tiền",
      "Đã nhập KiotViet",
      "Đang giao",
      "Hoàn tất",
    ]);
  });

  it("finds the current step per payment method", () => {
    expect(currentStepIndex("COD", "PENDING")).toBe(0);
    expect(currentStepIndex("COD", "ENTERED_KIOTVIET")).toBe(2);
    expect(currentStepIndex("BANK_TRANSFER", "PAID")).toBe(2);
    expect(currentStepIndex("BANK_TRANSFER", "ENTERED_KIOTVIET")).toBe(3);
    expect(currentStepIndex("BANK_TRANSFER", "COMPLETED")).toBe(5);
  });

  it("has no current step for a cancelled order or a status outside the flow", () => {
    expect(currentStepIndex("COD", "CANCELLED")).toBe(-1);
    expect(currentStepIndex("COD", "PAID")).toBe(-1);
  });

  it("marks steps before the current one done and later ones todo", () => {
    const states = orderStepStates("BANK_TRANSFER", "PAID").map((s) => s.state);
    expect(states).toEqual(["done", "done", "now", "todo", "todo", "todo"]);
  });

  it("marks every step done once completed and none when cancelled", () => {
    expect(orderStepStates("COD", "COMPLETED").every((s) => s.state === "done")).toBe(true);
    expect(orderStepStates("COD", "CANCELLED").every((s) => s.state === "todo")).toBe(true);
  });

  it("walks the quote steps", () => {
    const states = (status: QuoteStatus) => quoteStepStates(status).map((s) => s.state);
    expect(states("NEW")).toEqual(["now", "todo", "todo"]);
    expect(states("QUOTED")).toEqual(["done", "now", "todo"]);
    expect(states("WON")).toEqual(["done", "done", "done"]);
    expect(states("CANCELLED")).toEqual(["todo", "todo", "todo"]);
  });

  it("covers every order status in at least one flow", () => {
    const seen = new Set<OrderStatus>([...orderSteps("COD"), ...orderSteps("BANK_TRANSFER")].map((s) => s.status));
    for (const status of ORDER_STATUSES.filter((s) => s !== "CANCELLED")) expect(seen.has(status)).toBe(true);
  });
});

describe("bank review reasons", () => {
  it("labels all nine matcher reasons", () => {
    expect(BANK_REVIEW_REASON_LABELS).toEqual({
      NO_CODE: "Không thấy mã đơn",
      MULTIPLE_CODES: "Nhiều mã đơn",
      UNKNOWN_CODE: "Mã đơn không tồn tại",
      NOT_BANK_TRANSFER: "Đơn không chuyển khoản",
      NOT_CONFIRMED: "Đơn chưa xác nhận",
      ALREADY_PAID: "Đơn đã nhận tiền",
      AMOUNT_MISMATCH: "Lệch số tiền",
      WRONG_ACCOUNT: "Sai tài khoản",
      OUT_WITH_CODE: "Tiền ra có mã đơn",
    });
  });

  it("handles a missing or new reason", () => {
    expect(bankReviewReasonLabel(null)).toBe("-");
    expect(bankReviewReasonLabel("AMOUNT_MISMATCH")).toBe("Lệch số tiền");
    expect(bankReviewReasonLabel("FUTURE_REASON")).toBe("FUTURE_REASON");
  });
});

describe("history", () => {
  it("shows the webhook actor as the automatic bank match", () => {
    expect(actorLabel("BANK_WEBHOOK")).toBe("Tự động (ngân hàng)");
    expect(actorLabel("quanly")).toBe("quanly");
  });

  it("describes a status change with both labels", () => {
    expect(historyText("ORDER", { action: "ORDER_STATUS", from: "PENDING", to: "CONFIRMED" })).toBe(
      "Đổi trạng thái: Chờ xác nhận → Đã xác nhận",
    );
    expect(historyText("QUOTE", { action: "QUOTE_STATUS", from: "NEW", to: "QUOTED" })).toBe("Đổi trạng thái: Mới → Đã báo giá");
  });

  it("falls back to the raw action code", () => {
    expect(historyText("ORDER", { action: "ORDER_CREATED", from: null, to: null })).toBe("Khách đặt hàng");
    expect(historyText("ORDER", { action: "SOMETHING_ELSE", from: null, to: null })).toBe("SOMETHING_ELSE");
  });
});
