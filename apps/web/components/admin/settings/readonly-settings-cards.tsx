"use client";

import type { ReactNode } from "react";
import type { AdminSettings } from "@/lib/api/types";
import { formatPct, formatVnd } from "@/lib/format/money";
import { formatPhone } from "@/components/admin/requests/format";
import s from "./settings.module.css";

function InfoCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>{title}</h2>
      {note && <p className={s.cardNote}>{note}</p>}
      <div className={s.rows}>{children}</div>
    </section>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div>
      <span>
        {label}
        {desc && <span className={s.desc}>{desc}</span>}
      </span>
      <span>{children}</span>
    </div>
  );
}

const dash = (value: string) => (value.trim() === "" ? "-" : value);

/** Settings shown for reference only: they are changed by the developer, not from this screen. */
export function ReadonlySettingsCards({ settings }: { settings: AdminSettings }) {
  const { company, notifyOwnerEmail, pricingMismatchThresholdPct, discountTiers } = settings;
  return (
    <>
      <InfoCard title="Thông tin công ty" note="Hiển thị ở chân trang website.">
        <Row label="Tên công ty">{dash(company.name)}</Row>
        <Row label="Mã số thuế"><span className={s.mono}>{dash(company.taxCode)}</span></Row>
        <Row label="Địa chỉ">{dash(company.address)}</Row>
        <Row label="Kho">{dash(company.warehouse)}</Row>
        <Row label="Điện thoại"><span className={s.num}>{dash(formatPhone(company.phone))}</span></Row>
        <Row label="Email">{dash(company.email)}</Row>
      </InfoCard>

      <InfoCard title="Thông báo">
        <Row label="Email nhận thông báo" desc="Nhận thư khi có đơn hàng hoặc yêu cầu báo giá mới.">
          {dash(notifyOwnerEmail)}
        </Row>
      </InfoCard>

      <InfoCard title="Cảnh báo lệch giá">
        <Row label="Ngưỡng lệch giá" desc="Cảnh báo khi giá một quy cách lệch so với giá đơn vị cơ bản nhân quy đổi quá ngưỡng này.">
          <span className={s.num}>{formatPct(pricingMismatchThresholdPct)}</span>
        </Row>
      </InfoCard>

      <InfoCard title="Giảm giá theo giá trị đơn">
        {discountTiers.length === 0 ? (
          <Row label="Bậc giảm giá">Chưa áp dụng</Row>
        ) : (
          discountTiers.map((tier) => (
            <Row key={tier.threshold} label={`Đơn từ ${formatVnd(tier.threshold)}`}>
              <span className={s.num}>Giảm {formatPct(tier.pct)}</span>
            </Row>
          ))
        )}
      </InfoCard>
    </>
  );
}
