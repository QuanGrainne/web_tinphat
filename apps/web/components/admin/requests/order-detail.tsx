"use client";

import { useState } from "react";
import { Alert, Button, Skeleton, Tabs } from "antd";
import { useQuery } from "@tanstack/react-query";
import { orderStepStates, paidViaLabel, paymentLabel } from "@/lib/admin/order-labels";
import { fetchOrder, requestKeys } from "@/lib/admin/requests-api";
import type { RequestRow } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { errorMessage } from "./error-message";
import { formatDateTime, formatPhone, telHref } from "./format";
import { HistoryList } from "./history-list";
import { InternalNote } from "./internal-note";
import { OrderItemsTable } from "./items-table";
import { LinkedBankTransactions } from "./linked-bank-transactions";
import { OrderActions } from "./order-actions";
import s from "./requests.module.css";
import { StatusBadge, ToneBadge } from "./status-badge";
import { StatusSteps } from "./status-steps";
import { TotalsPanel } from "./totals-panel";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "history", label: "Lịch sử" },
];

/** Expanded panel of an order row: details, items, totals, actions and history. */
export function OrderDetail({ row }: { row: RequestRow }) {
  const [tab, setTab] = useState("info");
  const query = useQuery({
    queryKey: requestKeys.order(row.id),
    queryFn: () => fetchOrder(row.id),
    refetchInterval: 60_000,
  });

  if (query.isPending) {
    return (
      <div className={s.exp}>
        <div className={s.expBody}>
          <Skeleton active paragraph={{ rows: 5 }} />
        </div>
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className={s.exp}>
        <div className={s.expBody}>
          <Alert
            type="error"
            showIcon
            title={errorMessage(query.error)}
            action={<Button size="small" onClick={() => void query.refetch()}>Thử lại</Button>}
          />
        </div>
      </div>
    );
  }

  const order = query.data;
  const paidMismatch = order.paidAmount !== null && order.paidAmount !== order.total;
  return (
    <div className={s.exp}>
      <div className={s.expTabs}>
        <Tabs size="small" activeKey={tab} onChange={setTab} items={TABS} />
      </div>

      {tab === "info" ? (
        <>
          <div className={s.hd}>
            <span className={`${s.hdCode} ${s.mono}`}>{order.code}</span>
            <StatusBadge kind="ORDER" status={order.status} />
            {order.awaitsKiotVietEntry && <ToneBadge tone="orange">Chờ nhập KiotViet</ToneBadge>}
            <span className={s.muted}>
              Đơn đặt hàng · {paymentLabel(order.paymentMethod)} · phụ trách: {row.assigneeName ?? "Chưa gán"}
            </span>
          </div>
          <StatusSteps steps={orderStepStates(order.paymentMethod, order.status)} />
          <div className={s.expBody}>
            <div className={s.cols}>
              <div>
                <h4>Khách hàng</h4>
                <div className={s.kv}>
                  <div><span>Họ tên</span><span>{order.customerName}</span></div>
                  <div>
                    <span>Điện thoại / Zalo</span>
                    <span><a href={telHref(order.phone)}>{formatPhone(order.phone)}</a></span>
                  </div>
                  <div><span>Địa chỉ nhận</span><span>{order.address || "-"}</span></div>
                  <div><span>Ghi chú của khách</span><span>{order.note || "-"}</span></div>
                </div>
              </div>
              <div>
                <h4>Đơn hàng</h4>
                <div className={s.kv}>
                  <div><span>Thời gian đặt</span><span className={s.num}>{formatDateTime(order.createdAt)}</span></div>
                  <div><span>Thanh toán</span><span>{paymentLabel(order.paymentMethod)}</span></div>
                  <div>
                    <span>Mã đơn KiotViet</span>
                    <span className={s.mono}>{order.kiotvietOrderCode ?? "-"}</span>
                  </div>
                  {order.paidAmount !== null && (
                    <>
                      <div>
                        <span>Đã nhận</span>
                        <span className={s.num}>
                          {formatVnd(order.paidAmount)} {paidMismatch && <ToneBadge tone="orange">Lệch số tiền</ToneBadge>}
                        </span>
                      </div>
                      <div><span>Nhận qua</span><span>{paidViaLabel(order.paidVia)}</span></div>
                      <div><span>Lúc nhận</span><span className={s.num}>{formatDateTime(order.paidAt)}</span></div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <OrderItemsTable items={order.items} />

            <div className={s.bottom}>
              <InternalNote kind="orders" id={order.id} value={order.internalNote} detailKey={requestKeys.order(order.id)} />
              <TotalsPanel order={order} />
            </div>

            {order.bankTransactions.length > 0 && <LinkedBankTransactions rows={order.bankTransactions} />}
          </div>
        </>
      ) : (
        <div className={s.expBody}>
          <HistoryList kind="ORDER" entries={order.history} />
        </div>
      )}

      <OrderActions order={order} />
    </div>
  );
}
