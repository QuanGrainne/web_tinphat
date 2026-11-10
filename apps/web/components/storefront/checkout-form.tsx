"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ProblemError } from "@/lib/api/public-post";
import type {
  OrderSubmit,
  OrderView,
  PaymentMethod,
  PricedCart,
} from "@/lib/api/types";
import { clearBasket } from "@/lib/cart/cart-store";
import { getSubmissionId, resetSubmissionId } from "@/lib/cart/submission-id";
import { formatVnd } from "@/lib/format/money";
import { rememberOrder } from "@/lib/order/last-order";
import { diffPricedCarts, type PriceDiff } from "@/lib/order/price-diff";
import { describeProblem } from "@/lib/order/problem-view";
import { postPublic } from "@/lib/order/public-request";
import { usePricedBasket } from "@/lib/order/use-priced-basket";
import {
  optional,
  validateCheckoutForm,
  type CheckoutFormValues,
  type FieldErrors,
} from "@/lib/order/validation";
import { BasketLines } from "./basket-lines";
import { Alert, Honeypot, TextField } from "./form-field";

const FIELDS = ["customerName", "phone", "address", "note"] as const;
const EMPTY: CheckoutFormValues = {
  customerName: "",
  phone: "",
  address: "",
  note: "",
};

function isPricedCart(value: unknown): value is PricedCart {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as PricedCart).lines)
  );
}

function changeText(change: PriceDiff["changes"][number]): string {
  const name = change.unitName
    ? `${change.name} (${change.unitName})`
    : change.name;
  if (change.kind === "price")
    return `${name}: ${formatVnd(change.from ?? 0)} → ${formatVnd(change.to ?? 0)}`;
  if (change.kind === "unavailable") return `${name}: không còn bán`;
  return `${name}: chỉ báo giá, không thể đặt hàng`;
}

/** Content of /gio-hang: order basket, delivery form, payment choice and the order summary. */
export function CheckoutForm() {
  const router = useRouter();
  const basket = usePricedBasket("order");
  const [values, setValues] = useState<CheckoutFormValues>(EMPTY);
  const [payment, setPayment] = useState<PaymentMethod>("BANK_TRANSFER");
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors<keyof CheckoutFormValues>>(
    {},
  );
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<PriceDiff | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);
  useEffect(() => {
    if (notice) noticeRef.current?.focus();
  }, [notice]);

  const { lines, priced } = basket;
  const count = lines.length;
  const stuck = (priced?.lines ?? []).filter(
    (l) =>
      (l.unavailable || !l.orderable) && lines.some((c) => c.skuId === l.skuId),
  );
  const canOrder =
    basket.synced && stuck.length === 0 && !submitting && !redirecting;

  const bind = (key: keyof CheckoutFormValues) => ({
    value: values[key],
    error: errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canOrder || !priced) return;
    const found = validateCheckoutForm(values);
    setErrors(found);
    const first = FIELDS.find((key) => found[key]);
    if (first) {
      setMessage("Vui lòng kiểm tra lại các ô được đánh dấu.");
      document.getElementById(`order-${first}`)?.focus();
      return;
    }
    setSubmitting(true);
    setMessage(null);
    setNotice(null);
    const body: OrderSubmit = {
      submissionId: getSubmissionId("order"),
      customerName: values.customerName.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      note: optional(values.note),
      paymentMethod: payment,
      expectedTotal: priced.total,
      ...(website ? { website } : {}),
      lines,
    };
    try {
      const { data } = await postPublic<OrderView>("/api/public/orders", body);
      rememberOrder(data.code, values.phone);
      resetSubmissionId("order");
      setRedirecting(true);
      clearBasket("order");
      router.push(`/don-hang/${encodeURIComponent(data.code)}`);
    } catch (err) {
      if (
        err instanceof ProblemError &&
        err.code === "PRICE_CHANGED" &&
        isPricedCart(err.problem.pricedCart)
      ) {
        const next = err.problem.pricedCart;
        setNotice(diffPricedCarts(priced, next));
        basket.applyPriced(next);
      } else {
        const view = describeProblem(err, FIELDS);
        setErrors(view.fieldErrors);
        setMessage(view.message);
        if (view.code === "SKU_NOT_ORDERABLE" || view.code === "PRICE_CHANGED")
          basket.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (redirecting) {
    return (
      <div className="done-box" role="status">
        <h1 style={{ font: "700 18px/1.3 Inter" }}>Đã nhận đơn hàng</h1>
        <p>Đang chuyển đến trang đơn hàng...</p>
      </div>
    );
  }

  if (basket.hydrated && count === 0) {
    return (
      <div className="stack">
        <h1 style={{ font: "700 20px/1.2 Inter" }}>Giỏ hàng</h1>
        <div className="empty">
          <p>Giỏ hàng đang trống.</p>
          <Link className="btn btn-pri" href="/">
            Xem sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  const total = priced ? formatVnd(priced.total) : "—";
  const submitLabel = submitting ? "Đang đặt hàng..." : "Đặt hàng";

  return (
    <div className="cart">
      <section>
        <h1 style={{ font: "700 20px/1.2 Inter", marginBottom: 12 }}>
          Giỏ hàng
          {count > 0 ? (
            <span className="muted" style={{ fontWeight: 500, fontSize: 15 }}>
              {" "}
              · {count} sản phẩm
            </span>
          ) : null}
        </h1>
        <div className="stack-s" style={{ marginBottom: 12 }}>
          {notice ? (
            <Alert tone="warn" title="Giá đã thay đổi" ref={noticeRef}>
              {notice.changes.length > 0 ? (
                <ul>
                  {notice.changes.map((c) => (
                    <li key={c.skuId}>{changeText(c)}</li>
                  ))}
                </ul>
              ) : null}
              <p style={{ marginTop: 4 }}>
                {notice.totalFrom !== null &&
                notice.totalFrom !== notice.totalTo
                  ? `Tổng tiền hàng: ${formatVnd(notice.totalFrom)} → ${formatVnd(notice.totalTo)}. `
                  : `Tổng tiền hàng: ${formatVnd(notice.totalTo)}. `}
                Vui lòng kiểm tra rồi bấm Đặt hàng để xác nhận.
              </p>
            </Alert>
          ) : null}
          {basket.error ? (
            <Alert tone="err" title="Không tải được giá">
              {basket.error.message}{" "}
              <button
                type="button"
                className="btn-text"
                onClick={basket.refresh}
              >
                Thử lại
              </button>
            </Alert>
          ) : null}
          {stuck.length > 0 ? (
            <Alert tone="warn" title="Có sản phẩm chưa thể đặt hàng">
              Sản phẩm “Liên hệ” hoặc không còn bán không đặt được. Vui lòng xóa
              khỏi giỏ hàng hoặc chuyển sang báo giá.
            </Alert>
          ) : null}
        </div>
        {basket.hydrated ? (
          <BasketLines
            kind="order"
            lines={lines}
            priced={priced?.lines ?? null}
            busy={basket.loading}
          />
        ) : (
          <p className="muted" role="status">
            Đang tải...
          </p>
        )}

        <form
          id="checkout-form"
          className="stack"
          onSubmit={onSubmit}
          noValidate
        >
          <h2 className="box-t">Thông tin nhận hàng</h2>
          <div className="box" style={{ marginTop: -10 }}>
            <div className="f">
              {message ? (
                <Alert tone="err" ref={messageRef}>
                  {message}
                </Alert>
              ) : null}
              <div className="fr">
                <TextField
                  id="order-customerName"
                  label="Họ tên"
                  required
                  autoComplete="name"
                  maxLength={120}
                  {...bind("customerName")}
                />
                <TextField
                  id="order-phone"
                  label="Số điện thoại"
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={20}
                  {...bind("phone")}
                />
              </div>
              <TextField
                id="order-address"
                label="Địa chỉ nhận hàng"
                required
                autoComplete="street-address"
                maxLength={300}
                {...bind("address")}
              />
              <TextField
                id="order-note"
                label="Ghi chú"
                multiline
                maxLength={1000}
                {...bind("note")}
              />
              <Honeypot value={website} onChange={setWebsite} />
            </div>
          </div>

          <h2 className="box-t" style={{ marginBottom: 0 }}>
            Thanh toán
          </h2>
          <div className="pay" role="radiogroup" aria-label="Thanh toán">
            <label className="pay-o">
              <input
                type="radio"
                name="pay"
                value="COD"
                checked={payment === "COD"}
                onChange={() => setPayment("COD")}
              />
              Thanh toán khi nhận hàng (COD)
            </label>
            <label className="pay-o">
              <input
                type="radio"
                name="pay"
                value="BANK_TRANSFER"
                checked={payment === "BANK_TRANSFER"}
                onChange={() => setPayment("BANK_TRANSFER")}
              />
              Chuyển khoản
            </label>
          </div>
          {payment === "BANK_TRANSFER" ? (
            <p className="pay-hint">
              <i
                className="i i-qr"
                style={{ marginRight: 8 }}
                aria-hidden="true"
              />
              Sau khi đặt hàng, Quý khách nhận mã đơn và thông tin chuyển khoản.
              Mã QR hiển thị khi nhân viên xác nhận đơn.
            </p>
          ) : null}
        </form>
      </section>

      <aside>
        <div
          className={`box${basket.synced ? "" : " sum-busy"}`}
          aria-live="polite"
        >
          {priced && priced.discountTotal > 0 ? (
            <>
              <div className="sum-r sub">
                <span>Tiền hàng</span>
                <b>{formatVnd(priced.subtotal)}</b>
              </div>
              <div className="sum-r">
                <span>Giảm đã áp</span>
                <b className="disc">-{formatVnd(priced.discountTotal)}</b>
              </div>
              {priced.discountNote ? (
                <p className="sum-note">{priced.discountNote}</p>
              ) : null}
            </>
          ) : null}
          <div className="sum-r big">
            <span>Tổng tiền hàng</span>
            <b>{total}</b>
          </div>
          <div className="sum-r">
            <small>Giá đã gồm VAT</small>
          </div>
          <p className="ord-note">
            Nhân viên xác nhận tồn kho, phí giao và tổng tiền
          </p>
          <button
            className="btn btn-pri btn-lg btn-block only-d side-act"
            type="submit"
            form="checkout-form"
            disabled={!canOrder}
            aria-busy={submitting}
          >
            {submitLabel}
          </button>
        </div>
      </aside>

      <div className="sticky">
        <div className="tot">
          <small>Tổng</small>
          <b>{total}</b>
        </div>
        <button
          className="btn btn-pri"
          type="submit"
          form="checkout-form"
          disabled={!canOrder}
          aria-busy={submitting}
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
