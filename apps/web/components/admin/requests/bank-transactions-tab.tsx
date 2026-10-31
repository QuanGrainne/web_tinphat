"use client";

import { useState } from "react";
import { Alert, Button, Segmented, Table, type TableColumnsType } from "antd";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { bankTxKeys, fetchBankTransactions, type BankTxFilter } from "@/lib/admin/bank-transactions-api";
import { BANK_TX_STATUS_LABELS, bankReviewReasonLabel } from "@/lib/admin/order-labels";
import { REQUEST_PAGE_SIZE } from "@/lib/admin/requests-api";
import type { BankTransactionRow } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/money";
import { DismissBankTransactionDialog } from "./dismiss-bank-transaction-dialog";
import { errorMessage } from "./error-message";
import { formatDateTime } from "./format";
import { LinkBankTransactionDialog } from "./link-bank-transaction-dialog";
import s from "./requests.module.css";
import { ToneBadge } from "./status-badge";

const FILTERS: BankTxFilter[] = ["REVIEW", "MATCHED", "IGNORED"];

/** MANAGER only: bank transfers the matcher could not settle on its own, plus matched and dismissed history. */
export function BankTransactionsTab() {
  const [status, setStatus] = useState<BankTxFilter>("REVIEW");
  const [page, setPage] = useState(1);
  const [linking, setLinking] = useState<BankTransactionRow | null>(null);
  const [dismissing, setDismissing] = useState<BankTransactionRow | null>(null);

  const query = useQuery({
    queryKey: bankTxKeys.list(status, page),
    queryFn: () => fetchBankTransactions(status, page),
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });

  const columns: TableColumnsType<BankTransactionRow> = [
    {
      title: "Thời gian",
      key: "time",
      width: 140,
      render: (_, tx) => <span className={s.num}>{formatDateTime(tx.txTime)}</span>,
    },
    {
      title: "Số tiền",
      key: "amount",
      align: "right",
      width: 150,
      render: (_, tx) => (
        <span className={s.num}>
          {tx.direction === "OUT" && <ToneBadge tone="red">Tiền ra</ToneBadge>} {formatNumber(tx.amount)}
        </span>
      ),
    },
    {
      title: "Tài khoản",
      key: "account",
      width: 140,
      render: (_, tx) => <span className={s.mono}>{tx.accountNoMasked}</span>,
    },
    {
      title: "Nội dung",
      key: "content",
      render: (_, tx) => <div className={s.contentCell}>{tx.content}</div>,
    },
    ...(status === "REVIEW"
      ? [
          {
            title: "Lý do",
            key: "reason",
            width: 180,
            render: (_: unknown, tx: BankTransactionRow) => <ToneBadge tone="orange">{bankReviewReasonLabel(tx.reviewReason)}</ToneBadge>,
          },
        ]
      : [
          {
            title: "Đơn hàng",
            key: "order",
            width: 130,
            render: (_: unknown, tx: BankTransactionRow) => <span className={s.mono}>{tx.orderCode ?? "-"}</span>,
          },
          {
            title: "Ghi chú",
            key: "note",
            render: (_: unknown, tx: BankTransactionRow) => <div className={s.contentCell}>{tx.decisionNote ?? "-"}</div>,
          },
        ]),
    ...(status === "REVIEW"
      ? [
          {
            title: "Thao tác",
            key: "actions",
            width: 190,
            render: (_: unknown, tx: BankTransactionRow) => (
              <span style={{ display: "inline-flex", gap: 8 }}>
                <Button size="small" type="primary" onClick={() => setLinking(tx)}>
                  Gắn vào đơn
                </Button>
                <Button size="small" onClick={() => setDismissing(tx)}>
                  Bỏ qua
                </Button>
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <div className={s.bankBar}>
        <Segmented
          aria-label="Trạng thái giao dịch"
          value={status}
          options={FILTERS.map((value) => ({ value, label: BANK_TX_STATUS_LABELS[value] }))}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
      </div>
      <div className={s.tableWrap}>
        {query.isError && (
          <Alert
            type="error"
            showIcon
            title={errorMessage(query.error)}
            action={<Button size="small" onClick={() => void query.refetch()}>Thử lại</Button>}
            style={{ margin: 12 }}
          />
        )}
        <Table<BankTransactionRow>
          rowKey="id"
          columns={columns}
          dataSource={query.data?.items ?? []}
          loading={query.isPending || query.isPlaceholderData}
          locale={{ emptyText: status === "REVIEW" ? "Không có giao dịch cần duyệt" : "Không có giao dịch" }}
          pagination={{
            current: page,
            pageSize: REQUEST_PAGE_SIZE,
            total: query.data?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} giao dịch`,
            onChange: setPage,
            style: { padding: "0 12px" },
          }}
        />
      </div>
      {linking && <LinkBankTransactionDialog tx={linking} onClose={() => setLinking(null)} />}
      {dismissing && <DismissBankTransactionDialog tx={dismissing} onClose={() => setDismissing(null)} />}
    </div>
  );
}
