"use client";

import Link from "next/link";
import { useState } from "react";
import type { CartLineIn, PricedLine } from "@/lib/api/types";
import {
  MAX_QTY,
  addLine,
  removeLine,
  setQty,
  type BasketKind,
} from "@/lib/cart/cart-store";
import { formatVnd } from "@/lib/format/money";

interface BasketLinesProps {
  kind: BasketKind;
  /** Quantities as stored in the local basket. */
  lines: CartLineIn[];
  /** Last answer of the price API; rows for SKUs it has not priced yet render as placeholders. */
  priced: PricedLine[] | null;
  busy: boolean;
}

/** Product rows shared by the quote and order baskets (layout classes come from storefront.css). */
export function BasketLines({ kind, lines, priced, busy }: BasketLinesProps) {
  const bySku = new Map((priced ?? []).map((p) => [p.skuId, p]));
  return (
    <div className="lines" aria-busy={busy}>
      <div className="lh" aria-hidden="true">
        <span />
        <span>Sản phẩm</span>
        <span>Đơn giá</span>
        <span>Số lượng</span>
        <span>Thành tiền</span>
        <span />
      </div>
      {lines.map((line) => (
        <BasketRow
          key={line.skuId}
          kind={kind}
          line={line}
          priced={bySku.get(line.skuId)}
        />
      ))}
    </div>
  );
}

function RemoveButton({
  kind,
  skuId,
  label,
}: {
  kind: BasketKind;
  skuId: number;
  label: string;
}) {
  return (
    <button
      className="del"
      type="button"
      aria-label={`Xóa ${label}`}
      onClick={() => removeLine(kind, skuId)}
    >
      <i className="i i-trash" aria-hidden="true" />
    </button>
  );
}

function BasketRow({
  kind,
  line,
  priced,
}: {
  kind: BasketKind;
  line: CartLineIn;
  priced: PricedLine | undefined;
}) {
  if (!priced) {
    return (
      <div className="ln sk">
        <div className="ph" aria-hidden="true">
          <i className="i i-image" />
        </div>
        <div className="info2" role="status">
          <span className="sk-bar" style={{ width: "70%" }} />
          <span className="sr">Đang tải sản phẩm</span>
        </div>
        <RemoveButton kind={kind} skuId={line.skuId} label="sản phẩm" />
      </div>
    );
  }

  const gone = priced.unavailable;
  const unit = priced.unitPrice;
  const contact = !gone && (!priced.priceVisible || unit === null);
  const blocked = !gone && kind === "order" && !priced.orderable;
  const name = gone ? "Sản phẩm không còn bán" : priced.productName;
  const lineTotal = unit !== null ? unit * line.qty : null;
  const unitText =
    priced.conversion > 1
      ? `${priced.unitName} · quy đổi ${priced.conversion}`
      : priced.unitName;
  const hasPromo =
    unit !== null && priced.listPrice !== null && priced.listPrice > unit;

  return (
    <div className={`ln${gone || blocked ? " bad" : ""}`}>
      <div className="ph" aria-hidden="true">
        <i className="i i-image" />
      </div>
      <div className="info2">
        <b>
          {gone ? (
            name
          ) : (
            <Link href={`/san-pham/${priced.productSlug}`} prefetch={false}>
              {name}
            </Link>
          )}
        </b>
        {gone ? null : (
          <>
            <span>{unitText}</span>
            <span className="mono">{priced.code}</span>
          </>
        )}
        {gone ? (
          <span className="ln-note">Vui lòng xóa khỏi danh sách.</span>
        ) : null}
        {blocked ? (
          <>
            <span className="ln-note">
              Sản phẩm này chỉ báo giá, chưa thể đặt hàng.
            </span>
            <span className="ln-acts">
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  addLine("quote", line.skuId, line.qty);
                  removeLine("order", line.skuId);
                }}
              >
                Chuyển sang báo giá
              </button>
            </span>
          </>
        ) : null}
      </div>
      <div className={`pr1${contact ? " contact" : ""}`}>
        {gone ? null : contact ? (
          "Liên hệ"
        ) : (
          <>
            {hasPromo && priced.listPrice !== null ? (
              <s>{formatVnd(priced.listPrice)}</s>
            ) : null}
            {unit !== null ? formatVnd(unit) : null}
          </>
        )}
      </div>
      <QtyStepper
        kind={kind}
        skuId={line.skuId}
        qty={line.qty}
        label={name}
        disabled={gone}
      />
      <div className={`tot${contact || gone ? " contact" : ""}`}>
        {gone
          ? "—"
          : contact || lineTotal === null
            ? "Liên hệ"
            : formatVnd(lineTotal)}
      </div>
      <RemoveButton kind={kind} skuId={line.skuId} label={name} />
    </div>
  );
}

/** Stepper with a typeable quantity: valid numbers apply at once, anything else resets on blur. */
function QtyStepper({
  kind,
  skuId,
  qty,
  label,
  disabled,
}: {
  kind: BasketKind;
  skuId: number;
  qty: number;
  label: string;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="step">
      <button
        type="button"
        aria-label={`Giảm số lượng ${label}`}
        disabled={disabled || qty <= 1}
        onClick={() => setQty(kind, skuId, qty - 1)}
      >
        <i className="i i-minus" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={MAX_QTY}
        value={draft ?? String(qty)}
        disabled={disabled}
        aria-label={`Số lượng ${label}`}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= 1 && n <= MAX_QTY)
            setQty(kind, skuId, n);
        }}
        onBlur={() => setDraft(null)}
      />
      <button
        type="button"
        aria-label={`Tăng số lượng ${label}`}
        disabled={disabled || qty >= MAX_QTY}
        onClick={() => setQty(kind, skuId, qty + 1)}
      >
        <i className="i i-plus" aria-hidden="true" />
      </button>
    </div>
  );
}
