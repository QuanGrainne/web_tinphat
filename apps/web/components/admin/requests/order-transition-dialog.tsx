"use client";

import { useState } from "react";
import { Alert, App, Input, InputNumber } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { ORDER_ACTION_LABELS, ORDER_STATUS_LABELS } from "@/lib/admin/order-labels";
import { requestKeys, transitionOrder } from "@/lib/admin/requests-api";
import type { AdminOrder } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { ActionDialog, DialogField } from "./action-dialog";
import { isStateConflict } from "./error-message";
import { moneyInputFormatter, moneyInputParser } from "./format";
import s from "./requests.module.css";
import {
  KIOTVIET_CODE_MAX,
  NOTE_MAX,
  buildTransitionPayload,
  initialTransitionValues,
  isNoteRequired,
  isPaidAmountMismatch,
  totalWithShippingFee,
  transitionFields,
  validateTransition,
  type TransitionErrors,
  type TransitionValues,
} from "./transition-form";

interface Props {
  order: AdminOrder;
  transition: AdminOrder["allowedTransitions"][number];
  onClose: () => void;
}

/** Collects exactly the fields a status change needs, then calls the transition endpoint. */
export function OrderTransitionDialog({ order, transition, onClose }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const to = transition.to;
  const fields = transitionFields(order, to, transition.requires);
  const [values, setValues] = useState<TransitionValues>(() => initialTransitionValues(order));
  const [showErrors, setShowErrors] = useState(false);
  const errors = validateTransition(order, to, fields, values);
  const shown: TransitionErrors = showErrors ? errors : {};
  const set = (patch: Partial<TransitionValues>) => setValues((v) => ({ ...v, ...patch }));
  const idPrefix = `order-${order.id}-${to}`;

  async function submit(): Promise<boolean> {
    if (Object.keys(errors).length > 0) {
      setShowErrors(true);
      return false;
    }
    try {
      const updated = await transitionOrder(order.id, buildTransitionPayload(to, fields, values));
      queryClient.setQueryData(requestKeys.order(order.id), updated);
      void queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: requestKeys.counters() });
      message.success(`Đơn ${order.code}: ${ORDER_STATUS_LABELS[updated.status]}`);
      return true;
    } catch (error) {
      if (isStateConflict(error)) void queryClient.invalidateQueries({ queryKey: requestKeys.order(order.id) });
      throw error;
    }
  }

  const label = ORDER_ACTION_LABELS[to];
  const paidMismatch = fields.includes("paidAmount") && isPaidAmountMismatch(order, values.paidAmount);
  const noteRequired = isNoteRequired(order, to, values);

  return (
    <ActionDialog title={`${label} · ${order.code}`} okText={label} danger={to === "CANCELLED"} onSubmit={submit} onClose={onClose}>
      {fields.length === 0 && (
        <p>
          {to === "CANCELLED"
            ? `Hủy đơn ${order.code}? Không thể hoàn tác.`
            : `Chuyển đơn ${order.code} sang "${ORDER_STATUS_LABELS[to]}"?`}
        </p>
      )}

      {fields.includes("shippingFee") && (
        <>
          <DialogField label="Phí giao hàng" htmlFor={`${idPrefix}-fee`} required error={shown.shippingFee}>
            <InputNumber
              id={`${idPrefix}-fee`}
              autoFocus
              min={0}
              precision={0}
              controls={false}
              suffix="đ"
              style={{ width: "100%" }}
              value={values.shippingFee}
              onChange={(v) => set({ shippingFee: v })}
              formatter={moneyInputFormatter}
              parser={moneyInputParser}
              status={shown.shippingFee ? "error" : undefined}
            />
          </DialogField>
          <div className={s.dlgTotal}>
            <span>Khách cần trả</span>
            <span className={s.num}>{formatVnd(totalWithShippingFee(order, values.shippingFee))}</span>
          </div>
          <p className={s.hint}>Sau khi xác nhận không sửa được phí giao hàng và tổng tiền.</p>
        </>
      )}

      {fields.includes("paidAmount") && (
        <DialogField label="Số tiền nhận" htmlFor={`${idPrefix}-paid`} required error={shown.paidAmount}>
          <InputNumber
            id={`${idPrefix}-paid`}
            autoFocus
            min={0}
            precision={0}
            controls={false}
            suffix="đ"
            style={{ width: "100%" }}
            value={values.paidAmount}
            onChange={(v) => set({ paidAmount: v })}
            formatter={moneyInputFormatter}
            parser={moneyInputParser}
            status={shown.paidAmount ? "error" : undefined}
          />
          <div className={s.hint} style={{ margin: "4px 0 0" }}>Tổng đơn: {formatVnd(order.total)}</div>
        </DialogField>
      )}

      {paidMismatch && (
        <Alert
          type="warning"
          showIcon
          title="Lệch số tiền"
          description={`Số tiền nhận khác tổng đơn ${formatVnd(order.total)}. Ghi rõ lý do vào ghi chú.`}
          style={{ marginBottom: 14 }}
        />
      )}

      {to === "CANCELLED" && order.status === "PAID" && (
        <Alert
          type="warning"
          showIcon
          title="Đơn đã nhận tiền"
          description="Hủy đơn cần hoàn tiền cho khách. Ghi rõ việc hoàn tiền vào ghi chú."
          style={{ marginBottom: 14 }}
        />
      )}

      {fields.includes("kiotvietOrderCode") && (
        <DialogField label="Mã đơn KiotViet" htmlFor={`${idPrefix}-kv`} required error={shown.kiotvietOrderCode}>
          <Input
            id={`${idPrefix}-kv`}
            autoFocus
            maxLength={KIOTVIET_CODE_MAX}
            placeholder="Nhập sau khi tạo đơn trong KiotViet"
            value={values.kiotvietOrderCode}
            onChange={(e) => set({ kiotvietOrderCode: e.target.value })}
            status={shown.kiotvietOrderCode ? "error" : undefined}
          />
        </DialogField>
      )}

      {fields.includes("note") && (
        <DialogField
          label={to === "CANCELLED" ? "Ghi chú (hoàn tiền cho khách)" : "Ghi chú"}
          htmlFor={`${idPrefix}-note`}
          required={noteRequired}
          error={shown.note}
        >
          <Input.TextArea
            id={`${idPrefix}-note`}
            rows={3}
            maxLength={NOTE_MAX}
            value={values.note}
            onChange={(e) => set({ note: e.target.value })}
            status={shown.note ? "error" : undefined}
          />
        </DialogField>
      )}
    </ActionDialog>
  );
}
