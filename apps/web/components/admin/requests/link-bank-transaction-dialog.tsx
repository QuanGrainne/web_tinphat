"use client";

import { useState } from "react";
import { Alert, App, Checkbox, Input, Radio } from "antd";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { bankTxKeys, linkBankTransaction } from "@/lib/admin/bank-transactions-api";
import { paymentLabel } from "@/lib/admin/order-labels";
import { requestKeys, searchOrders } from "@/lib/admin/requests-api";
import type { BankTransactionRow, RequestRow } from "@/lib/api/types";
import { formatNumber, formatVnd } from "@/lib/format/money";
import { ActionDialog, DialogField } from "./action-dialog";
import { guessOrderCodes, isLinkAmountMismatch } from "./bank-link-form";
import { errorMessage } from "./error-message";
import { NOTE_MAX } from "./transition-form";
import s from "./requests.module.css";
import { StatusBadge } from "./status-badge";
import { useDebouncedValue } from "./use-debounced-value";

const MIN_SEARCH_LENGTH = 3;

/** Link a bank transfer to an order, optionally marking it paid (the normal manual PAID step). */
export function LinkBankTransactionDialog({ tx, onClose }: { tx: BankTransactionRow; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => guessOrderCodes(tx.content)[0] ?? "");
  const term = useDebouncedValue(search.trim(), 350);
  const results = useQuery({
    queryKey: requestKeys.orderSearch(term),
    queryFn: () => searchOrders(term),
    enabled: term.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
  });
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [markPaid, setMarkPaid] = useState(false);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const canMarkPaid = tx.direction === "IN";
  const effectiveMarkPaid = markPaid && canMarkPaid;
  const mismatch = isLinkAmountMismatch({ markPaid: effectiveMarkPaid, txAmount: tx.amount, orderTotal: selected?.total ?? null });
  const notPayable =
    effectiveMarkPaid && selected !== null && !(selected.paymentMethod === "BANK_TRANSFER" && selected.status === "CONFIRMED");

  const errors = {
    order: selected === null ? "Chọn đơn hàng cần gắn." : undefined,
    note: mismatch && note.trim() === "" ? "Nhập ghi chú giải thích lệch số tiền." : undefined,
  };

  async function submit(): Promise<boolean> {
    if (errors.order || errors.note) {
      setShowErrors(true);
      return false;
    }
    if (selected === null) return false;
    await linkBankTransaction(tx.id, {
      orderId: selected.id,
      markPaid: effectiveMarkPaid,
      note: note.trim() === "" ? undefined : note.trim(),
    });
    void queryClient.invalidateQueries({ queryKey: bankTxKeys.all });
    void queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    void queryClient.invalidateQueries({ queryKey: requestKeys.counters() });
    void queryClient.invalidateQueries({ queryKey: requestKeys.order(selected.id) });
    message.success(`Đã gắn giao dịch vào đơn ${selected.code}`);
    return true;
  }

  const items = term.length >= MIN_SEARCH_LENGTH ? (results.data?.items ?? []) : [];

  return (
    <ActionDialog title="Gắn vào đơn" okText="Gắn vào đơn" width={620} onSubmit={submit} onClose={onClose}>
      <p className={s.hint}>
        {formatNumber(tx.amount)}đ · {tx.content}
      </p>

      <DialogField label="Đơn hàng" htmlFor="link-order-search" required error={showErrors ? errors.order : undefined}>
        <Input
          id="link-order-search"
          allowClear
          autoFocus
          placeholder="Tìm theo mã đơn, tên khách, số điện thoại"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {term.length >= MIN_SEARCH_LENGTH && results.isError && (
          <Alert type="error" showIcon title={errorMessage(results.error)} style={{ marginTop: 8 }} />
        )}
        {items.length > 0 && (
          <Radio.Group
            className={s.orderPick}
            value={selected?.id}
            onChange={(e) => setSelected(items.find((o) => o.id === e.target.value) ?? null)}
          >
            {items.map((order) => (
              <Radio key={order.id} value={order.id}>
                <span className={s.orderPickItem}>
                  <span className={s.mono}>{order.code}</span>
                  <span>{order.customerName}</span>
                  <span className={`${s.muted} ${s.num}`}>
                    {order.total === null ? "-" : formatVnd(order.total)} · {paymentLabel(order.paymentMethod)}
                  </span>
                  <StatusBadge kind="ORDER" status={order.status} />
                </span>
              </Radio>
            ))}
          </Radio.Group>
        )}
        {term.length >= MIN_SEARCH_LENGTH && !results.isFetching && !results.isError && items.length === 0 && (
          <div className={s.hint} style={{ margin: "6px 0 0" }}>Không tìm thấy đơn hàng.</div>
        )}
      </DialogField>

      <div className={s.dlgRow}>
        <Checkbox checked={effectiveMarkPaid} disabled={!canMarkPaid} onChange={(e) => setMarkPaid(e.target.checked)}>
          Đánh dấu đã nhận tiền
        </Checkbox>
        {!canMarkPaid && <div className={s.hint} style={{ margin: "4px 0 0" }}>Giao dịch tiền ra không đánh dấu đã nhận tiền được.</div>}
      </div>

      {notPayable && (
        <Alert
          type="warning"
          showIcon
          title="Chỉ đơn chuyển khoản đã xác nhận mới đánh dấu đã nhận tiền được."
          style={{ marginBottom: 14 }}
        />
      )}
      {mismatch && selected?.total != null && (
        <Alert
          type="warning"
          showIcon
          title="Lệch số tiền"
          description={`Giao dịch ${formatVnd(tx.amount)}, tổng đơn ${formatVnd(selected.total)}. Ghi rõ lý do vào ghi chú.`}
          style={{ marginBottom: 14 }}
        />
      )}

      <DialogField label="Ghi chú" htmlFor="link-note" required={mismatch} error={showErrors ? errors.note : undefined}>
        <Input.TextArea id="link-note" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} />
      </DialogField>
    </ActionDialog>
  );
}
