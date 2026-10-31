"use client";

import { Select } from "antd";
import { anyStatusLabel, statusesForKind, type RequestKind } from "@/lib/admin/order-labels";
import type { RequestFilters } from "@/lib/admin/requests-api";
import s from "./requests.module.css";

interface PillOption {
  value: string;
  label: string;
}

function PillGroup({
  id,
  title,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  title: string;
  value: string;
  options: PillOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={s.fb}>
      <h3 id={id}>{title}</h3>
      <div className={s.pills} role="group" aria-labelledby={id}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`${s.pill} ${o.value === value ? s.pillOn : ""}`}
            aria-pressed={o.value === value}
            disabled={disabled}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const KIND_OPTIONS: PillOption[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "ORDER", label: "Đơn hàng" },
  { value: "QUOTE", label: "Báo giá" },
];

const PAYMENT_OPTIONS: PillOption[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "COD", label: "COD" },
  { value: "BANK_TRANSFER", label: "Chuyển khoản" },
];

const STATUS_TITLE: Record<RequestKind | "ALL", string> = {
  ALL: "Trạng thái",
  ORDER: "Trạng thái đơn hàng",
  QUOTE: "Trạng thái báo giá",
};

interface Props {
  filters: RequestFilters;
  onChange: (next: RequestFilters) => void;
}

/** Left column: kind, status (by kind) and payment filters. */
export function RequestFilterColumn({ filters, onChange }: Props) {
  const statusOptions = statusesForKind(filters.kind).map((status) => ({ value: status, label: anyStatusLabel(status) }));

  function changeKind(value: string) {
    const kind = value === "ALL" ? undefined : (value as RequestKind);
    const status = filters.status && statusesForKind(kind).includes(filters.status) ? filters.status : undefined;
    onChange({ ...filters, kind, status, payment: kind === "QUOTE" ? undefined : filters.payment });
  }

  return (
    <aside className={s.fcol} aria-label="Bộ lọc">
      <PillGroup id="kind-filter-title" title="Loại yêu cầu" value={filters.kind ?? "ALL"} options={KIND_OPTIONS} onChange={changeKind} />

      <div className={s.fb}>
        <h3 id="status-filter-title">{STATUS_TITLE[filters.kind ?? "ALL"]}</h3>
        <Select
          aria-labelledby="status-filter-title"
          style={{ width: "100%" }}
          allowClear
          placeholder="Tất cả trạng thái"
          value={filters.status}
          options={statusOptions}
          onChange={(status: string | undefined) => onChange({ ...filters, status: status ?? undefined })}
        />
      </div>

      <PillGroup
        id="payment-filter-title"
        title="Thanh toán"
        value={filters.payment ?? "ALL"}
        options={PAYMENT_OPTIONS}
        disabled={filters.kind === "QUOTE"}
        onChange={(value) => onChange({ ...filters, payment: value === "ALL" ? undefined : (value as "COD" | "BANK_TRANSFER") })}
      />
    </aside>
  );
}
