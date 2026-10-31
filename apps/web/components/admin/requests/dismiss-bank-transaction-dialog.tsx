"use client";

import { useState } from "react";
import { App, Input } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { bankTxKeys, dismissBankTransaction } from "@/lib/admin/bank-transactions-api";
import { requestKeys } from "@/lib/admin/requests-api";
import type { BankTransactionRow } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/money";
import { ActionDialog, DialogField } from "./action-dialog";
import s from "./requests.module.css";
import { NOTE_MAX } from "./transition-form";

/** Dismiss a bank transfer that is not an order payment; the reason is required and kept in the audit trail. */
export function DismissBankTransactionDialog({ tx, onClose }: { tx: BankTransactionRow; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [showError, setShowError] = useState(false);
  const missing = note.trim() === "";

  async function submit(): Promise<boolean> {
    if (missing) {
      setShowError(true);
      return false;
    }
    await dismissBankTransaction(tx.id, note.trim());
    void queryClient.invalidateQueries({ queryKey: bankTxKeys.all });
    void queryClient.invalidateQueries({ queryKey: requestKeys.counters() });
    message.success("Đã bỏ qua giao dịch");
    return true;
  }

  return (
    <ActionDialog title="Bỏ qua giao dịch" okText="Bỏ qua giao dịch" cancelText="Đóng" danger onSubmit={submit} onClose={onClose}>
      <p className={s.hint}>
        {formatNumber(tx.amount)}đ · {tx.content}
      </p>
      <DialogField label="Ghi chú" htmlFor="dismiss-note" required error={showError && missing ? "Nhập lý do bỏ qua giao dịch." : undefined}>
        <Input.TextArea
          id="dismiss-note"
          autoFocus
          rows={3}
          maxLength={NOTE_MAX}
          placeholder="Ví dụ: khách chuyển nhầm, tiền hoàn từ nhà cung cấp"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </DialogField>
    </ActionDialog>
  );
}
