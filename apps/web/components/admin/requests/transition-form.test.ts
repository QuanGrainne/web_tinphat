import { describe, expect, it } from "vitest";
import type { OrderStatus } from "@/lib/api/types";
import {
  buildTransitionPayload,
  initialTransitionValues,
  isNoteRequired,
  isPaidAmountMismatch,
  totalWithShippingFee,
  transitionFields,
  validateTransition,
  type TransitionValues,
} from "./transition-form";

const order = (status: OrderStatus = "CONFIRMED") => ({ status, total: 1_985_900, subtotal: 2_000_000, discountTotal: 14_100 });

const values = (patch: Partial<TransitionValues> = {}): TransitionValues => ({ ...initialTransitionValues(order()), ...patch });

describe("initial values", () => {
  it("defaults the fee to 0 and the received amount to the order total", () => {
    expect(initialTransitionValues({ total: 428_500 })).toEqual({
      shippingFee: 0,
      paidAmount: 428_500,
      note: "",
      kiotvietOrderCode: "",
    });
  });
});

describe("transitionFields", () => {
  it("shows what the server requires", () => {
    expect(transitionFields(order("PENDING"), "CONFIRMED", ["shippingFee"])).toEqual(["shippingFee"]);
    expect(transitionFields(order("CONFIRMED"), "ENTERED_KIOTVIET", ["kiotvietOrderCode"])).toEqual(["kiotvietOrderCode"]);
  });

  it("always collects amount and note for paid, even when the server lists only one", () => {
    expect(transitionFields(order(), "PAID", ["paidAmount"])).toEqual(["paidAmount", "note"]);
    expect(transitionFields(order(), "PAID", [])).toEqual(["paidAmount", "note"]);
  });

  it("asks for a refund note only when cancelling a paid order", () => {
    expect(transitionFields(order("PAID"), "CANCELLED", [])).toEqual(["note"]);
    expect(transitionFields(order("PENDING"), "CANCELLED", [])).toEqual([]);
  });

  it("has no fields for a plain step", () => {
    expect(transitionFields(order("ENTERED_KIOTVIET"), "SHIPPING", [])).toEqual([]);
  });
});

describe("amounts", () => {
  it("adds the fee to the discounted subtotal", () => {
    expect(totalWithShippingFee(order(), 30_000)).toBe(2_015_900);
    expect(totalWithShippingFee(order(), null)).toBe(1_985_900);
    expect(totalWithShippingFee(order(), 0)).toBe(1_985_900);
  });

  it("flags a received amount that differs from the total", () => {
    expect(isPaidAmountMismatch(order(), 1_985_900)).toBe(false);
    expect(isPaidAmountMismatch(order(), 1_985_899)).toBe(true);
    expect(isPaidAmountMismatch(order(), null)).toBe(false);
  });
});

describe("isNoteRequired", () => {
  it("requires a note only for a mismatched paid amount or a paid cancellation", () => {
    expect(isNoteRequired(order(), "PAID", values({ paidAmount: 1_985_900 }))).toBe(false);
    expect(isNoteRequired(order(), "PAID", values({ paidAmount: 1_000_000 }))).toBe(true);
    expect(isNoteRequired(order("PAID"), "CANCELLED", values())).toBe(true);
    expect(isNoteRequired(order("PENDING"), "CANCELLED", values())).toBe(false);
    expect(isNoteRequired(order(), "CONFIRMED", values())).toBe(false);
  });
});

describe("validateTransition", () => {
  it("accepts a zero fee but not a negative or fractional one", () => {
    expect(validateTransition(order("PENDING"), "CONFIRMED", ["shippingFee"], values({ shippingFee: 0 }))).toEqual({});
    expect(validateTransition(order("PENDING"), "CONFIRMED", ["shippingFee"], values({ shippingFee: -1 })).shippingFee).toBeDefined();
    expect(validateTransition(order("PENDING"), "CONFIRMED", ["shippingFee"], values({ shippingFee: 1.5 })).shippingFee).toBeDefined();
    expect(validateTransition(order("PENDING"), "CONFIRMED", ["shippingFee"], values({ shippingFee: null })).shippingFee).toBeDefined();
  });

  it("accepts the exact amount without a note", () => {
    expect(validateTransition(order(), "PAID", ["paidAmount", "note"], values())).toEqual({});
  });

  it("requires a note when the amount differs", () => {
    const errors = validateTransition(order(), "PAID", ["paidAmount", "note"], values({ paidAmount: 1_900_000 }));
    expect(errors.note).toBeDefined();
    expect(validateTransition(order(), "PAID", ["paidAmount", "note"], values({ paidAmount: 1_900_000, note: "Khách trừ phí ship" }))).toEqual({});
  });

  it("rejects a missing or zero received amount", () => {
    expect(validateTransition(order(), "PAID", ["paidAmount", "note"], values({ paidAmount: null })).paidAmount).toBeDefined();
    expect(validateTransition(order(), "PAID", ["paidAmount", "note"], values({ paidAmount: 0, note: "x" })).paidAmount).toBeDefined();
  });

  it("requires the KiotViet code, trimmed", () => {
    expect(validateTransition(order(), "ENTERED_KIOTVIET", ["kiotvietOrderCode"], values({ kiotvietOrderCode: "   " })).kiotvietOrderCode).toBeDefined();
    expect(validateTransition(order(), "ENTERED_KIOTVIET", ["kiotvietOrderCode"], values({ kiotvietOrderCode: " DH000123 " }))).toEqual({});
  });

  it("requires a refund note when cancelling a paid order", () => {
    expect(validateTransition(order("PAID"), "CANCELLED", ["note"], values()).note).toBeDefined();
    expect(validateTransition(order("PAID"), "CANCELLED", ["note"], values({ note: "Hoàn tiền cho khách" }))).toEqual({});
  });

  it("checks only the fields that are shown", () => {
    expect(validateTransition(order(), "SHIPPING", [], values({ shippingFee: -5, paidAmount: null }))).toEqual({});
  });
});

describe("buildTransitionPayload", () => {
  it("sends the fee for confirm", () => {
    expect(buildTransitionPayload("CONFIRMED", ["shippingFee"], values({ shippingFee: 30_000, note: "ignored" }))).toEqual({
      to: "CONFIRMED",
      shippingFee: 30_000,
    });
  });

  it("sends amount and trimmed note for paid, omitting a blank note", () => {
    expect(buildTransitionPayload("PAID", ["paidAmount", "note"], values({ paidAmount: 1_900_000, note: "  lệch phí  " }))).toEqual({
      to: "PAID",
      paidAmount: 1_900_000,
      note: "lệch phí",
    });
    expect(buildTransitionPayload("PAID", ["paidAmount", "note"], values())).toEqual({ to: "PAID", paidAmount: 1_985_900 });
  });

  it("sends the trimmed KiotViet code", () => {
    expect(buildTransitionPayload("ENTERED_KIOTVIET", ["kiotvietOrderCode"], values({ kiotvietOrderCode: " DH1 " }))).toEqual({
      to: "ENTERED_KIOTVIET",
      kiotvietOrderCode: "DH1",
    });
  });

  it("sends only `to` for a plain step", () => {
    expect(buildTransitionPayload("SHIPPING", [], values({ shippingFee: 99, note: "x" }))).toEqual({ to: "SHIPPING" });
  });
});
