import type { OrderStatus, PaymentMethod } from "@/lib/api/types";
import { STATUS_LABEL, orderSteps } from "@/lib/order/order-steps";

const CHIP: Record<OrderStatus, string> = {
  PENDING: "stt-wait",
  CONFIRMED: "stt-conf",
  PAID: "stt-paid",
  ENTERED_KIOTVIET: "stt-conf",
  SHIPPING: "stt-conf",
  COMPLETED: "stt-paid",
  CANCELLED: "stt-off",
};

export function StatusChip({ status }: { status: OrderStatus }) {
  return <span className={`stt ${CHIP[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** Numbered progress bar. Cancelled orders render nothing here; the page shows the "Đã hủy" chip and a notice. */
export function OrderStatusSteps({
  method,
  status,
}: {
  method: PaymentMethod;
  status: OrderStatus;
}) {
  const steps = orderSteps(method, status);
  if (steps.length === 0) return null;
  return (
    <ol
      className={`steps${steps.length > 5 ? " s6" : ""}`}
      aria-label="Trạng thái đơn hàng"
    >
      {steps.map((step) => (
        <li
          key={step.status}
          className={step.state === "todo" ? undefined : step.state}
          aria-current={step.state === "now" ? "step" : undefined}
        >
          {step.label}
        </li>
      ))}
    </ol>
  );
}
