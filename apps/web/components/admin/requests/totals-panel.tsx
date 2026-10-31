"use client";

import type { AdminOrder } from "@/lib/api/types";
import { formatNumber, formatVnd } from "@/lib/format/money";
import s from "./requests.module.css";

/** Order totals: goods, applied discount, delivery fee (once staff set it) and what the customer pays. */
export function TotalsPanel({ order }: { order: Pick<AdminOrder, "subtotal" | "discountTotal" | "discountNote" | "shippingFee" | "total"> }) {
  return (
    <div className={s.sum}>
      <div>
        <span>Tổng tiền hàng (đã gồm VAT)</span>
        <b className={s.num}>{formatVnd(order.subtotal)}</b>
      </div>
      {order.discountTotal > 0 && (
        <div>
          <span>
            Giảm đã áp
            {order.discountNote && <small className={s.sumNote}>{order.discountNote}</small>}
          </span>
          <span className={s.num}>-{formatNumber(order.discountTotal)}đ</span>
        </div>
      )}
      {order.shippingFee !== null && (
        <div>
          <span>Phí giao hàng</span>
          <span className={s.num}>{formatVnd(order.shippingFee)}</span>
        </div>
      )}
      <div className={s.sumTotal}>
        <span>Khách cần trả</span>
        <span className={s.num}>{formatVnd(order.total)}</span>
      </div>
    </div>
  );
}
