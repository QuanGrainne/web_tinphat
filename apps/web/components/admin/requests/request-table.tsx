"use client";

import type { KeyboardEvent } from "react";
import { Alert, Button, Table, type TableColumnsType } from "antd";
import { paymentLabel } from "@/lib/admin/order-labels";
import { REQUEST_PAGE_SIZE } from "@/lib/admin/requests-api";
import type { RequestList, RequestRow } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/money";
import { errorMessage } from "./error-message";
import { formatDateTime, formatPhone } from "./format";
import { RequestDetail } from "./request-detail";
import s from "./requests.module.css";
import { StatusBadge } from "./status-badge";

/** The bold totals row sits right under the header (KiotViet pattern), so it is a first row of the table. */
interface TotalsRow {
  kind: "TOTAL";
}
type TableRow = RequestRow | TotalsRow;

const isTotals = (row: TableRow): row is TotalsRow => row.kind === "TOTAL";

export const requestRowKey = (row: RequestRow) => `${row.kind}-${row.id}`;
const tableRowKey = (row: TableRow) => (isTotals(row) ? "totals" : requestRowKey(row));

interface Props {
  list: RequestList | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  page: number;
  onPageChange: (page: number) => void;
  /** Key (`kind-id`) of the row whose detail is open. */
  expandedKey: string | null;
  onExpandedChange: (key: string | null) => void;
}

export function RequestTable({ list, loading, error, onRetry, page, onPageChange, expandedKey, onExpandedChange }: Props) {
  const rows: TableRow[] = list ? [{ kind: "TOTAL" }, ...list.items] : [];

  const columns: TableColumnsType<TableRow> = [
    {
      title: "Mã",
      key: "code",
      width: 150,
      render: (_, row) =>
        isTotals(row) ? null : (
          <span className={`${s.code} ${tableRowKey(row) === expandedKey ? s.codeOpen : ""}`}>{row.code}</span>
        ),
    },
    { title: "Khách hàng", key: "customer", render: (_, row) => (isTotals(row) ? null : row.customerName) },
    {
      title: "Số điện thoại",
      key: "phone",
      width: 130,
      render: (_, row) => (isTotals(row) ? null : <span className={s.num}>{formatPhone(row.phone)}</span>),
    },
    {
      title: "Thời gian",
      key: "time",
      width: 140,
      render: (_, row) => (isTotals(row) ? null : <span className={s.num}>{formatDateTime(row.createdAt)}</span>),
    },
    {
      title: "SL",
      key: "items",
      align: "right",
      width: 70,
      render: (_, row) => <span className={s.num}>{isTotals(row) ? (list?.totals.count ?? "") : row.itemCount}</span>,
    },
    {
      title: "Tổng tiền",
      key: "total",
      align: "right",
      width: 120,
      render: (_, row) => {
        if (isTotals(row)) return <span className={s.num}>{formatNumber(list?.totals.totalAmount ?? 0)}</span>;
        return <span className={s.num}>{row.total === null ? "-" : formatNumber(row.total)}</span>;
      },
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 120,
      render: (_, row) => (isTotals(row) ? null : paymentLabel(row.paymentMethod)),
    },
    {
      title: "Phụ trách",
      key: "assignee",
      width: 110,
      render: (_, row) => (isTotals(row) ? null : <span className={row.assigneeName ? "" : s.muted}>{row.assigneeName ?? "Chưa gán"}</span>),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_, row) => (isTotals(row) ? null : <StatusBadge kind={row.kind} status={row.status} />),
    },
  ];

  const toggle = (row: TableRow) => {
    if (isTotals(row)) return;
    const key = requestRowKey(row);
    onExpandedChange(key === expandedKey ? null : key);
  };

  return (
    <div className={s.tableWrap}>
      {error !== null && error !== undefined && (
        <Alert
          type="error"
          showIcon
          title={errorMessage(error)}
          action={<Button size="small" onClick={onRetry}>Thử lại</Button>}
          style={{ margin: 12 }}
        />
      )}
      <Table<TableRow>
        rowKey={tableRowKey}
        columns={columns}
        dataSource={rows}
        loading={loading}
        pagination={{
          current: page,
          pageSize: REQUEST_PAGE_SIZE,
          total: list?.total ?? 0,
          showSizeChanger: false,
          showTotal: (total) => `Tổng ${total} yêu cầu`,
          onChange: onPageChange,
          style: { padding: "0 12px" },
        }}
        locale={{ emptyText: "Không có yêu cầu nào" }}
        rowClassName={(row) => {
          if (isTotals(row)) return s.totalsRow;
          return `${s.clickRow} ${requestRowKey(row) === expandedKey ? s.openRow : ""}`;
        }}
        onRow={(row) => ({
          tabIndex: isTotals(row) ? undefined : 0,
          "aria-expanded": isTotals(row) ? undefined : requestRowKey(row) === expandedKey,
          onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggle(row);
            }
          },
        })}
        expandable={{
          expandedRowKeys: expandedKey ? [expandedKey] : [],
          expandRowByClick: true,
          showExpandColumn: false,
          rowExpandable: (row) => !isTotals(row),
          onExpand: (_open, row) => toggle(row),
          expandedRowClassName: () => s.expandedRow,
          expandedRowRender: (row) => (isTotals(row) ? null : <RequestDetail row={row} />),
        }}
      />
    </div>
  );
}
