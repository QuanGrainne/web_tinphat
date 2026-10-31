"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import type { PublicSku } from "@/lib/api/types";
import { addLine, getCart, MAX_LINES, MAX_QTY, type BasketKind } from "@/lib/cart/cart-store";
import { formatNumber, formatVnd } from "@/lib/format/money";
import { SavingBadge } from "./saving-badge";

interface ProductBuyProps {
  brand: { name: string; slug: string } | null;
  skus: PublicSku[];
}

type PricedSku = PublicSku & { effectivePrice: number };

/** A SKU shows numbers only when the API sent a visible price; otherwise it is "Liên hệ". */
function isPriced(sku: PublicSku): sku is PricedSku {
  return sku.priceVisible && sku.effectivePrice !== null;
}

function clampQty(text: string): number {
  const n = Number.parseInt(text, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX_QTY) : 1;
}

interface Toast {
  text: string;
  href?: string;
  linkText?: string;
}

const BASKETS: Record<BasketKind, { label: string; href: string; linkText: string }> = {
  quote: { label: "báo giá", href: "/bao-gia", linkText: "Xem báo giá" },
  order: { label: "giỏ hàng", href: "/gio-hang", linkText: "Xem giỏ hàng" },
};

export function ProductBuy({ brand, skus }: ProductBuyProps) {
  if (skus.length === 0) {
    return (
      <div className="price">
        <b>Liên hệ</b>
      </div>
    );
  }
  return <PurchasePanel brand={brand} skus={skus} />;
}

function PurchasePanel({ brand, skus }: ProductBuyProps) {
  const [index, setIndex] = useState(0);
  const [qtyText, setQtyText] = useState("1");
  const [toast, setToast] = useState<Toast | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const sel = skus[index];
  const base = skus.find((s) => s.isBase) ?? skus[0];
  const baseName = base.unitName.toLowerCase();
  const unitName = sel.unitName.toLowerCase();
  const priced = isPriced(sel);
  const qty = clampQty(qtyText);

  function add(kind: BasketKind) {
    if (kind === "order" && !priced) return;
    addLine(kind, sel.id, qty);
    const target = BASKETS[kind];
    const stored = getCart()[kind].some((line) => line.skuId === sel.id);
    setToast(
      stored
        ? { text: `Đã thêm ${qty} ${unitName} vào ${target.label}.`, href: target.href, linkText: target.linkText }
        : { text: `Danh sách ${target.label} đã đủ ${MAX_LINES} dòng. Hãy bớt một dòng rồi thêm lại.`, href: target.href, linkText: target.linkText },
    );
  }

  function onTileKeyDown(event: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = skus.length - 1;
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = i === last ? 0 : i + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = i === 0 ? last : i - 1;
    else return;
    event.preventDefault();
    setIndex(next);
    tileRefs.current[next]?.focus();
  }

  const buttons = (
    <>
      <button type="button" className={`btn ${priced ? "btn-out" : "btn-pri"}`} onClick={() => add("quote")}>
        Thêm báo giá
      </button>
      <button
        type="button"
        className="btn btn-pri"
        disabled={!priced}
        title={priced ? undefined : "Quy cách này chỉ nhận báo giá"}
        onClick={() => add("order")}
      >
        Thêm vào giỏ
      </button>
    </>
  );

  return (
    <>
      <div className="meta">
        <span>
          Mã hàng: <b className="mono">{sel.code}</b>
        </span>
        {brand && (
          <span>
            Thương hiệu:{" "}
            <Link href={`/thuong-hieu/${brand.slug}`}>
              <b>{brand.name}</b>
            </Link>
          </span>
        )}
      </div>

      <div className="price" aria-live="polite">
        {priced ? (
          <>
            <b>{formatVnd(sel.effectivePrice)}</b>
            <small>/ {unitName}</small>
            {sel.promoActive && sel.price !== null && sel.price !== sel.effectivePrice && (
              <span className="was">{formatVnd(sel.price)}</span>
            )}
            {sel.promoActive && <span className="sale">Sale</span>}
            <SavingBadge saving={sel.saving} />
          </>
        ) : (
          <b>Liên hệ</b>
        )}
      </div>
      <div className="vat">
        <i className="i i-check" aria-hidden="true" />
        Giá đã gồm VAT
      </div>

      <span className="lbl-s" id="unit-label">
        Quy cách
      </span>
      <div className="units" style={{ "--n": skus.length } as CSSProperties} role="radiogroup" aria-labelledby="unit-label">
        {skus.map((s, i) => {
          const tilePriced = isPriced(s);
          return (
            <button
              key={s.id}
              ref={(node) => {
                tileRefs.current[i] = node;
              }}
              type="button"
              role="radio"
              className="unit"
              aria-checked={i === index}
              tabIndex={i === index ? 0 : -1}
              onClick={() => setIndex(i)}
              onKeyDown={(event) => onTileKeyDown(event, i)}
            >
              <b>{s.unitName}</b>
              <span>{tilePriced ? `${s.conversion} ${baseName}` : " "}</span>
              <em>{tilePriced ? formatVnd(s.effectivePrice) : "Liên hệ"}</em>
            </button>
          );
        })}
      </div>
      <p className="unit-note">
        {priced && !sel.isBase && sel.perBaseUnit !== null ? (
          <>
            1 {unitName} = <b>{`${sel.conversion} ${baseName}`}</b> · {formatVnd(sel.perBaseUnit)} / {baseName}
          </>
        ) : (
          " "
        )}
      </p>

      <div className="qty">
        <div className="step">
          <button type="button" aria-label="Giảm" onClick={() => setQtyText(String(Math.max(1, qty - 1)))}>
            <i className="i i-minus" aria-hidden="true" />
          </button>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="Số lượng"
            value={qtyText}
            onChange={(event) => setQtyText(event.target.value.replace(/\D/g, "").slice(0, 4))}
            onBlur={() => setQtyText(String(qty))}
          />
          <button type="button" aria-label="Tăng" onClick={() => setQtyText(String(Math.min(MAX_QTY, qty + 1)))}>
            <i className="i i-plus" aria-hidden="true" />
          </button>
        </div>
        <div className="sum" aria-live="polite">
          <small>{priced ? `${formatNumber(qty * sel.conversion)} ${baseName}` : `${qty} ${unitName}`}</small>
          <b>{priced ? formatVnd(qty * sel.effectivePrice) : "Liên hệ"}</b>
        </div>
      </div>

      <div className="acts in-page">{buttons}</div>

      <span className="lbl-s lbl-all">Tất cả quy cách</span>
      <div className="qrows" role="table" aria-label="Tất cả quy cách">
        <div className="qhead" role="row">
          <span role="columnheader">Đơn vị</span>
          <span role="columnheader">Quy đổi</span>
          <span role="columnheader">Mã hàng</span>
          <span role="columnheader" style={{ textAlign: "right" }}>
            Giá
          </span>
        </div>
        {skus.map((s, i) => (
          <div key={s.id} className={`qrow${i === index ? " on" : ""}`} role="row" onClick={() => setIndex(i)}>
            <span className="uq">
              <b role="rowheader">{s.unitName}</b>{" "}
              <span className="q" role="cell">
                {isPriced(s) ? `= ${s.conversion} ${baseName}` : ""}
              </span>
            </span>
            <span className="c mono" role="cell">
              {s.code}
            </span>
            <span className="p" role="cell">
              {isPriced(s) ? formatVnd(s.effectivePrice) : "Liên hệ"}
            </span>
          </div>
        ))}
      </div>

      <div className="sticky pd-sticky">{buttons}</div>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.text}</span>
          {toast.href && <Link href={toast.href}>{toast.linkText}</Link>}
        </div>
      )}
    </>
  );
}
