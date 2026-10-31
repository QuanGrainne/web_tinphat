"use client";

import type { OrderView } from "@/lib/api/types";
import { formatDateTimeVn } from "@/lib/order/format-time";
import { bankBlockMode } from "@/lib/order/order-steps";
import { BankKv, VietQrSvg } from "./vietqr-svg";

/**
 * Payment block of the order page, driven only by what the API returned:
 * PENDING -> account number and content as text, no QR; CONFIRMED with qrAmount -> VietQR plus the same text;
 * paid -> a received message instead of the bank details.
 */
export function BankTransferBlock({ order }: { order: OrderView }) {
  const mode = bankBlockMode(order);
  if (mode === "none") return null;

  if (mode === "paid") {
    const when = order.paidAt ? formatDateTimeVn(order.paidAt) : "";
    return (
      <>
        <h2 className="box-t">Chuyển khoản</h2>
        <div className="paybox ok" role="status">
          <i className="i i-check" aria-hidden="true" />
          Đã nhận tiền{when ? ` lúc ${when}` : ""}. Cảm ơn Quý khách.
        </div>
      </>
    );
  }

  if (!order.bank) return null;
  return (
    <>
      <h2 className="box-t">Chuyển khoản</h2>
      <div className="paybox">
        {mode === "qr" && order.qrAmount !== null ? (
          <>
            <VietQrSvg bank={order.bank} amount={order.qrAmount} />
            <p className="note">Vui lòng chuyển đúng số tiền và nội dung để đơn được ghi nhận.</p>
          </>
        ) : (
          <>
            <BankKv bank={order.bank} />
            <p className="note">Số tiền cần chuyển và mã QR hiển thị sau khi nhân viên xác nhận đơn.</p>
          </>
        )}
      </div>
    </>
  );
}
