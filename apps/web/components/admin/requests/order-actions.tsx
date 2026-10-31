"use client";

import { useState } from "react";
import { Button } from "antd";
import { ORDER_ACTION_LABELS } from "@/lib/admin/order-labels";
import type { AdminOrder } from "@/lib/api/types";
import { OrderTransitionDialog } from "./order-transition-dialog";
import s from "./requests.module.css";

/** One button per transition the server allows for this user; cancel on the left, forward steps on the right. */
export function OrderActions({ order }: { order: AdminOrder }) {
  const [target, setTarget] = useState<AdminOrder["allowedTransitions"][number] | null>(null);
  if (order.allowedTransitions.length === 0) return null;
  const cancel = order.allowedTransitions.filter((t) => t.to === "CANCELLED");
  const forward = order.allowedTransitions.filter((t) => t.to !== "CANCELLED");
  return (
    <div className={s.expFoot}>
      {cancel.map((t) => (
        <Button key={t.to} danger onClick={() => setTarget(t)}>
          {ORDER_ACTION_LABELS[t.to]}
        </Button>
      ))}
      {forward.map((t) => (
        <Button key={t.to} type="primary" onClick={() => setTarget(t)}>
          {ORDER_ACTION_LABELS[t.to]}
        </Button>
      ))}
      {target && <OrderTransitionDialog order={order} transition={target} onClose={() => setTarget(null)} />}
    </div>
  );
}
