"use client";

import { useState } from "react";
import { Alert, Button, Skeleton, Tabs } from "antd";
import { useQuery } from "@tanstack/react-query";
import { quoteStepStates } from "@/lib/admin/order-labels";
import { fetchQuote, requestKeys } from "@/lib/admin/requests-api";
import type { RequestRow } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { errorMessage } from "./error-message";
import { formatDateTime, formatPhone, telHref } from "./format";
import { HistoryList } from "./history-list";
import { InternalNote } from "./internal-note";
import { QuoteLinesTable } from "./items-table";
import { QuoteActions } from "./quote-actions";
import s from "./requests.module.css";
import { StatusBadge } from "./status-badge";
import { StatusSteps } from "./status-steps";

const TABS = [
  { key: "info", label: "Thông tin" },
  { key: "history", label: "Lịch sử" },
];

/** Expanded panel of a quote row: customer, lines, subtotal, actions and history. */
export function QuoteDetail({ row }: { row: RequestRow }) {
  const [tab, setTab] = useState("info");
  const query = useQuery({
    queryKey: requestKeys.quote(row.id),
    queryFn: () => fetchQuote(row.id),
    refetchInterval: 60_000,
  });

  if (query.isPending) {
    return (
      <div className={s.exp}>
        <div className={s.expBody}>
          <Skeleton active paragraph={{ rows: 4 }} />
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

  const quote = query.data;
  return (
    <div className={s.exp}>
      <div className={s.expTabs}>
        <Tabs size="small" activeKey={tab} onChange={setTab} items={TABS} />
      </div>

      {tab === "info" ? (
        <>
          <div className={s.hd}>
            <span className={`${s.hdCode} ${s.mono}`}>{quote.code}</span>
            <StatusBadge kind="QUOTE" status={quote.status} />
            <span className={s.muted}>
              Yêu cầu báo giá · {formatDateTime(quote.createdAt)} · phụ trách: {row.assigneeName ?? "Chưa gán"}
            </span>
          </div>
          <StatusSteps steps={quoteStepStates(quote.status)} />
          <div className={s.expBody}>
            <div className={s.cols}>
              <div>
                <h4>Khách hàng</h4>
                <div className={s.kv}>
                  <div><span>Họ tên</span><span>{quote.customerName}</span></div>
                  <div>
                    <span>Điện thoại / Zalo</span>
                    <span><a href={telHref(quote.phone)}>{formatPhone(quote.phone)}</a></span>
                  </div>
                  <div><span>Email</span><span>{quote.email ?? "-"}</span></div>
                </div>
              </div>
              <div>
                <h4>&nbsp;</h4>
                <div className={s.kv}>
                  <div><span>Công ty / Cửa hàng</span><span>{quote.company ?? "-"}</span></div>
                  <div><span>Mã số thuế</span><span className={s.mono}>{quote.taxCode ?? "-"}</span></div>
                  <div><span>Ghi chú của khách</span><span>{quote.note || "-"}</span></div>
                </div>
              </div>
            </div>

            <QuoteLinesTable lines={quote.lines} />

            <div className={s.bottom}>
              <InternalNote kind="quotes" id={quote.id} value={quote.internalNote} detailKey={requestKeys.quote(quote.id)} />
              <div className={s.sum}>
                <div className={s.sumTotal}>
                  <span>
                    Tổng tiền hàng (đã gồm VAT)
                    {quote.hasContactLines && <small className={s.sumWarn}>Có mặt hàng cần báo giá riêng</small>}
                  </span>
                  <span className={s.num}>{formatVnd(quote.subtotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className={s.expBody}>
          <HistoryList kind="QUOTE" entries={quote.history} />
        </div>
      )}

      <QuoteActions quote={quote} />
    </div>
  );
}
