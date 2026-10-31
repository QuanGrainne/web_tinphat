import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { orderStepStates, quoteStepStates } from "@/lib/admin/order-labels";
import { OrderItemsTable, QuoteLinesTable } from "./items-table";
import { StatusBadge } from "./status-badge";
import { StatusSteps } from "./status-steps";
import { TotalsPanel } from "./totals-panel";

const totals = { subtotal: 1_152_680, discountTotal: 0, discountNote: null, shippingFee: null, total: 1_152_680 };

describe("TotalsPanel", () => {
  it("shows goods and the amount due, without discount or fee rows when none apply", () => {
    const html = renderToStaticMarkup(<TotalsPanel order={totals} />);
    expect(html).toContain("Tổng tiền hàng (đã gồm VAT)");
    expect(html).toContain("Khách cần trả");
    expect(html).toContain("1.152.680đ");
    expect(html).not.toContain("Giảm đã áp");
    expect(html).not.toContain("Phí giao hàng");
  });

  it("shows the applied discount with its note and the fee once staff set it", () => {
    const html = renderToStaticMarkup(
      <TotalsPanel
        order={{
          subtotal: 1_152_680,
          discountTotal: 23_054,
          discountNote: "Ưu đãi 2% cho đơn từ 1.000.000đ",
          shippingFee: 30_000,
          total: 1_159_626,
        }}
      />,
    );
    expect(html).toContain("Giảm đã áp");
    expect(html).toContain("Ưu đãi 2% cho đơn từ 1.000.000đ");
    expect(html).toContain("-23.054đ");
    expect(html).toContain("Phí giao hàng");
    expect(html).toContain("30.000đ");
    expect(html).toContain("1.159.626đ");
  });

  it("shows a zero fee as set", () => {
    const html = renderToStaticMarkup(<TotalsPanel order={{ ...totals, shippingFee: 0 }} />);
    expect(html).toContain("Phí giao hàng");
  });
});

describe("OrderItemsTable", () => {
  const items = [
    { skuId: 1, skuCode: "SV320-3L-Thùng 50G", productName: "Giấy ăn Gấu trúc", unitName: "Thùng", conversion: 50, qty: 2, listPrice: 10_000, unitPrice: 8_000, lineTotal: 16_000 },
    { skuId: 2, skuCode: "GP15A", productName: "Pin GP", unitName: "Hộp", conversion: 1, qty: 1, listPrice: 5_000, unitPrice: 5_000, lineTotal: 5_000 },
  ];

  it("strikes the list price only on a line sold below it", () => {
    const html = renderToStaticMarkup(<OrderItemsTable items={items} />);
    expect(html).toMatch(/<span[^>]*>10\.000<\/span>/);
    expect(html).not.toMatch(/<span[^>]*>5\.000<\/span>/);
    expect(html).toContain("8.000");
    expect(html).toContain("16.000");
  });

  it("prints the SKU code as stored and the pack size next to the unit", () => {
    const html = renderToStaticMarkup(<OrderItemsTable items={items} />);
    expect(html).toContain("SV320-3L-Thùng 50G");
    expect(html).toContain("×50");
    expect(html).not.toContain("×1<");
  });
});

describe("QuoteLinesTable", () => {
  it("shows Liên hệ for a line without a price", () => {
    const html = renderToStaticMarkup(
      <QuoteLinesTable
        lines={[
          { skuCode: "A1", productName: "Có giá", unitName: "Gói", conversion: 1, qty: 3, unitPrice: 9_000, lineTotal: 27_000 },
          { skuCode: "B2", productName: "Liên hệ báo giá", unitName: "Thùng", conversion: 20, qty: 1, unitPrice: null, lineTotal: null },
        ]}
      />,
    );
    expect(html).toContain("27.000");
    expect(html).toContain("Liên hệ");
  });
});

describe("StatusSteps", () => {
  it("marks the current step and lists the transfer flow", () => {
    const html = renderToStaticMarkup(<StatusSteps steps={orderStepStates("BANK_TRANSFER", "PAID")} />);
    expect(html).toContain("Đã nhận tiền");
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it("has no current step once a quote is won", () => {
    const html = renderToStaticMarkup(<StatusSteps steps={quoteStepStates("WON")} />);
    expect(html).not.toContain("aria-current");
    expect(html).toContain("Chốt");
  });
});

describe("StatusBadge", () => {
  it("shows the Vietnamese label for the kind", () => {
    expect(renderToStaticMarkup(<StatusBadge kind="ORDER" status="ENTERED_KIOTVIET" />)).toContain("Đã nhập KiotViet");
    expect(renderToStaticMarkup(<StatusBadge kind="QUOTE" status="WON" />)).toContain("Chốt");
  });
});
