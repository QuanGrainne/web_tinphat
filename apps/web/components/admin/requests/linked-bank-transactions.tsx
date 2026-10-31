"use client";

import { BANK_TX_STATUS_LABELS, BANK_TX_STATUS_TONES } from "@/lib/admin/order-labels";
import type { BankTransactionRow } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/money";
import { formatDateTime } from "./format";
import s from "./requests.module.css";
import { ToneBadge } from "./status-badge";

/** Bank transfers linked to an order (matched by the webhook or linked by a manager). */
export function LinkedBankTransactions({ rows }: { rows: BankTransactionRow[] }) {
  return (
    <div className={s.sub}>
      <h4>Giao dịch ngân hàng</h4>
      <table className={s.items}>
        <thead>
          <tr>
            <th scope="col">Thời gian</th>
            <th scope="col" className={s.right}>Số tiền</th>
            <th scope="col">Nội dung</th>
            <th scope="col">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => (
            <tr key={tx.id}>
              <td className={s.num}>{formatDateTime(tx.txTime)}</td>
              <td className={`${s.right} ${s.num}`}>{formatNumber(tx.amount)}</td>
              <td>{tx.content}</td>
              <td>
                <ToneBadge tone={BANK_TX_STATUS_TONES[tx.status]}>{BANK_TX_STATUS_LABELS[tx.status]}</ToneBadge>
                {tx.decisionNote && <span className={s.historyNote}>{tx.decisionNote}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
