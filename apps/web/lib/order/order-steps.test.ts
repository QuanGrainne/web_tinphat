import { describe, expect, it } from "vitest";
import { bankBlockMode, orderSteps } from "./order-steps";

describe("orderSteps", () => {
  it("COD flow has five steps without the paid step", () => {
    const steps = orderSteps("COD", "CONFIRMED");
    expect(steps.map((s) => s.label)).toEqual(["Chờ xác nhận", "Đã xác nhận", "Đã nhập KiotViet", "Đang giao", "Hoàn tất"]);
    expect(steps.map((s) => s.state)).toEqual(["done", "now", "todo", "todo", "todo"]);
  });

  it("bank transfer adds Đã nhận tiền after Đã xác nhận", () => {
    const steps = orderSteps("BANK_TRANSFER", "PAID");
    expect(steps.map((s) => s.label)).toEqual([
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đã nhận tiền",
      "Đã nhập KiotViet",
      "Đang giao",
      "Hoàn tất",
    ]);
    expect(steps.map((s) => s.state)).toEqual(["done", "done", "now", "todo", "todo", "todo"]);
  });

  it("a completed order has every step done", () => {
    expect(orderSteps("COD", "COMPLETED").every((s) => s.state === "done")).toBe(true);
  });

  it("a cancelled order has no steps", () => {
    expect(orderSteps("COD", "CANCELLED")).toEqual([]);
    expect(orderSteps("BANK_TRANSFER", "CANCELLED")).toEqual([]);
  });
});

describe("bankBlockMode", () => {
  const bank = { bankName: "B", bin: "970436", accountNo: "1", accountName: "N", content: "DNA7K2M9Q" };
  const order = { paymentMethod: "BANK_TRANSFER" as const, bank, qrAmount: null as number | null };

  it("PENDING shows text only, never a QR", () => {
    expect(bankBlockMode({ ...order, status: "PENDING" })).toBe("text");
    expect(bankBlockMode({ ...order, status: "PENDING", qrAmount: 1182680 })).toBe("text");
  });

  it("CONFIRMED shows the QR only when the API gives an amount", () => {
    expect(bankBlockMode({ ...order, status: "CONFIRMED", qrAmount: 1182680 })).toBe("qr");
    expect(bankBlockMode({ ...order, status: "CONFIRMED", qrAmount: null })).toBe("text");
  });

  it("paid and later statuses show the received message", () => {
    for (const status of ["PAID", "ENTERED_KIOTVIET", "SHIPPING", "COMPLETED"] as const) {
      expect(bankBlockMode({ ...order, bank: null, status })).toBe("paid");
    }
  });

  it("COD, cancelled orders and a missing bank show nothing", () => {
    expect(bankBlockMode({ ...order, paymentMethod: "COD", bank: null, status: "PENDING" })).toBe("none");
    expect(bankBlockMode({ ...order, status: "CANCELLED" })).toBe("none");
    expect(bankBlockMode({ ...order, bank: null, status: "CONFIRMED" })).toBe("none");
  });
});
