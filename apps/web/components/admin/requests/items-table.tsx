"use client";

import type { AdminOrder, AdminQuote } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/money";
import s from "./requests.module.css";

function UnitCell({ unitName, conversion }: { unitName: string; conversion: number }) {
  return (
    <>
      {unitName}
      {conversion > 1 && <span className={s.muted}> ×{conversion}</span>}
    </>
  );
}

const HEAD = (
  <tr>
    <th scope="col">STT</th>
    <th scope="col">Mã hàng</th>
    <th scope="col">Tên hàng</th>
    <th scope="col">ĐVT</th>
    <th scope="col" className={s.right}>SL</th>
    <th scope="col" className={s.right}>Đơn giá</th>
    <th scope="col" className={s.right}>Thành tiền</th>
  </tr>
);

/** Snapshot lines of an order; the list price is struck through when the order price differs (promo). */
export function OrderItemsTable({ items }: { items: AdminOrder["items"] }) {
  return (
    <table className={s.items}>
      <thead>{HEAD}</thead>
      <tbody>
        {items.map((item, i) => (
          <tr key={`${item.skuId}-${i}`}>
            <td>{i + 1}</td>
            <td className={s.mono}>{item.skuCode}</td>
            <td>{item.productName}</td>
            <td><UnitCell unitName={item.unitName} conversion={item.conversion} /></td>
            <td className={`${s.right} ${s.num}`}>{item.qty}</td>
            <td className={`${s.right} ${s.num}`}>
              {item.listPrice !== item.unitPrice && <span className={s.struck}>{formatNumber(item.listPrice)}</span>}
              {formatNumber(item.unitPrice)}
            </td>
            <td className={`${s.right} ${s.num}`}>{formatNumber(item.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Quote lines: a line without a price shows "Liên hệ" (to be quoted separately). */
export function QuoteLinesTable({ lines }: { lines: AdminQuote["lines"] }) {
  return (
    <table className={s.items}>
      <thead>{HEAD}</thead>
      <tbody>
        {lines.map((line, i) => (
          <tr key={`${line.skuCode}-${i}`}>
            <td>{i + 1}</td>
            <td className={s.mono}>{line.skuCode}</td>
            <td>{line.productName}</td>
            <td><UnitCell unitName={line.unitName} conversion={line.conversion} /></td>
            <td className={`${s.right} ${s.num}`}>{line.qty}</td>
            <td className={`${s.right} ${s.num}`}>{line.unitPrice === null ? "Liên hệ" : formatNumber(line.unitPrice)}</td>
            <td className={`${s.right} ${s.num}`}>{line.lineTotal === null ? "-" : formatNumber(line.lineTotal)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
