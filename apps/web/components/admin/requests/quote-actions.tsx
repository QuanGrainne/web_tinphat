"use client";

import { useState } from "react";
import { App, Button } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { QUOTE_ACTION_LABELS, QUOTE_STATUS_LABELS } from "@/lib/admin/order-labels";
import { requestKeys, transitionQuote } from "@/lib/admin/requests-api";
import type { AdminQuote, QuoteStatus } from "@/lib/api/types";
import { ActionDialog } from "./action-dialog";
import { isStateConflict } from "./error-message";
import s from "./requests.module.css";

/** Quote transitions (Đã báo giá / Chốt / Hủy) as buttons; each asks for confirmation first. */
export function QuoteActions({ quote }: { quote: AdminQuote }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<QuoteStatus | null>(null);
  if (quote.allowedTransitions.length === 0) return null;
  const cancel = quote.allowedTransitions.filter((t) => t.to === "CANCELLED");
  const forward = quote.allowedTransitions.filter((t) => t.to !== "CANCELLED");

  async function submit(to: QuoteStatus): Promise<boolean> {
    try {
      const updated = await transitionQuote(quote.id, { to });
      queryClient.setQueryData(requestKeys.quote(quote.id), updated);
      void queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: requestKeys.counters() });
      message.success(`Báo giá ${quote.code}: ${QUOTE_STATUS_LABELS[updated.status]}`);
      return true;
    } catch (error) {
      if (isStateConflict(error)) void queryClient.invalidateQueries({ queryKey: requestKeys.quote(quote.id) });
      throw error;
    }
  }

  return (
    <div className={s.expFoot}>
      {cancel.map((t) => (
        <Button key={t.to} danger onClick={() => setTarget(t.to)}>
          {QUOTE_ACTION_LABELS[t.to]}
        </Button>
      ))}
      {forward.map((t) => (
        <Button key={t.to} type="primary" onClick={() => setTarget(t.to)}>
          {QUOTE_ACTION_LABELS[t.to]}
        </Button>
      ))}
      {target && (
        <ActionDialog
          title={`${QUOTE_ACTION_LABELS[target]} · ${quote.code}`}
          okText={QUOTE_ACTION_LABELS[target]}
          danger={target === "CANCELLED"}
          onSubmit={() => submit(target)}
          onClose={() => setTarget(null)}
        >
          <p>
            {target === "CANCELLED"
              ? `Hủy yêu cầu báo giá ${quote.code}? Không thể hoàn tác.`
              : `Chuyển yêu cầu ${quote.code} sang "${QUOTE_STATUS_LABELS[target]}"?`}
          </p>
        </ActionDialog>
      )}
    </div>
  );
}
