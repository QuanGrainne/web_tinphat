"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import type { QuoteSubmit, QuoteView } from "@/lib/api/types";
import { clearBasket, removeLine } from "@/lib/cart/cart-store";
import { getSubmissionId, resetSubmissionId } from "@/lib/cart/submission-id";
import { formatVnd } from "@/lib/format/money";
import { describeProblem } from "@/lib/order/problem-view";
import { postPublic } from "@/lib/order/public-request";
import { usePricedBasket } from "@/lib/order/use-priced-basket";
import { optional, validateQuoteForm, type FieldErrors, type QuoteFormValues } from "@/lib/order/validation";
import { BasketLines } from "./basket-lines";
import { Alert, Honeypot, TextField } from "./form-field";

const FIELDS = ["customerName", "phone", "email", "company", "taxCode", "note"] as const;
const EMPTY: QuoteFormValues = { customerName: "", phone: "", email: "", company: "", taxCode: "", note: "" };

/** Content of /bao-gia: quote basket (repriced by the API) and the request form. */
export function QuoteForm() {
  const basket = usePricedBasket("quote");
  const [values, setValues] = useState<QuoteFormValues>(EMPTY);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<FieldErrors<keyof QuoteFormValues>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<QuoteView | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message) messageRef.current?.focus();
  }, [message]);

  if (sent) return <QuoteSent quote={sent} />;

  const { lines, priced } = basket;
  const count = lines.length;
  const gone = (priced?.lines ?? []).filter((l) => l.unavailable && lines.some((c) => c.skuId === l.skuId));

  const bind = (key: keyof QuoteFormValues) => ({
    value: values[key],
    error: errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((v) => ({ ...v, [key]: e.target.value }));
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
  });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    const found = validateQuoteForm(values);
    setErrors(found);
    const first = FIELDS.find((key) => found[key]);
    if (first) {
      setMessage("Vui lòng kiểm tra lại các ô được đánh dấu.");
      document.getElementById(`quote-${first}`)?.focus();
      return;
    }
    if (gone.length > 0) {
      setMessage("Có sản phẩm không còn bán. Vui lòng xóa khỏi danh sách rồi gửi lại.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    const body: QuoteSubmit = {
      submissionId: getSubmissionId("quote"),
      customerName: values.customerName.trim(),
      phone: values.phone.trim(),
      email: optional(values.email),
      company: optional(values.company),
      taxCode: optional(values.taxCode),
      note: optional(values.note),
      ...(website ? { website } : {}),
      lines,
    };
    try {
      const { data } = await postPublic<QuoteView>("/api/public/quotes", body);
      resetSubmissionId("quote");
      clearBasket("quote");
      setSent(data);
    } catch (err) {
      const view = describeProblem(err, FIELDS);
      setErrors(view.fieldErrors);
      setMessage(view.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (basket.hydrated && count === 0) {
    return (
      <div className="stack">
        <h1 style={{ font: "700 20px/1.2 Inter" }}>Báo giá</h1>
        <div className="empty">
          <p>Danh sách báo giá đang trống.</p>
          <Link className="btn btn-pri" href="/">
            Xem sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart">
      <section>
        <h1 style={{ font: "700 20px/1.2 Inter", marginBottom: 12 }}>
          Báo giá
          {count > 0 ? (
            <span className="muted" style={{ fontWeight: 500, fontSize: 15 }}>
              {" "}
              · {count} sản phẩm
            </span>
          ) : null}
        </h1>
        <div className="stack-s" style={{ marginBottom: 12 }}>
          {basket.error ? (
            <Alert tone="err" title="Không tải được giá">
              {basket.error.message}{" "}
              <button type="button" className="btn-text" onClick={basket.refresh}>
                Thử lại
              </button>
            </Alert>
          ) : null}
          {gone.length > 0 ? (
            <Alert tone="warn" title="Có sản phẩm không còn bán">
              Vui lòng xóa khỏi danh sách để gửi yêu cầu.{" "}
              <button type="button" className="btn-text" onClick={() => gone.forEach((l) => removeLine("quote", l.skuId))}>
                Xóa sản phẩm không còn bán
              </button>
            </Alert>
          ) : null}
        </div>
        {basket.hydrated ? (
          <>
            <BasketLines kind="quote" lines={lines} priced={priced?.lines ?? null} busy={basket.loading} />
            <div className="add-more">
              <Link className="btn" href="/">
                <i className="i i-plus" style={{ width: 14, height: 14 }} aria-hidden="true" />
                Thêm sản phẩm
              </Link>
            </div>
          </>
        ) : (
          <p className="muted" role="status">
            Đang tải...
          </p>
        )}
      </section>
      <aside>
        <div className={`box${basket.synced ? "" : " sum-busy"}`} aria-live="polite">
          <div className="sum-r big">
            <span>Tạm tính</span>
            <b>{priced ? formatVnd(priced.subtotal) : "—"}</b>
          </div>
          {priced?.hasContactLines ? <p className="sum-note">Chưa gồm sản phẩm “Liên hệ”. Nhân viên sẽ báo giá riêng.</p> : null}
          <div className="sum-r">
            <small>Giá đã gồm VAT</small>
          </div>
        </div>
        <div className="box" style={{ marginTop: 12 }}>
          <h2>Thông tin nhận báo giá</h2>
          <form className="f" onSubmit={onSubmit} noValidate>
            {message ? (
              <Alert tone="err" ref={messageRef}>
                {message}
              </Alert>
            ) : null}
            <div className="fr">
              <TextField id="quote-customerName" label="Người liên hệ" required autoComplete="name" maxLength={120} {...bind("customerName")} />
              <TextField id="quote-phone" label="Số điện thoại" required type="tel" inputMode="tel" autoComplete="tel" maxLength={20} {...bind("phone")} />
            </div>
            <TextField id="quote-email" label="Email" type="email" autoComplete="email" maxLength={160} {...bind("email")} />
            <div className="fr">
              <TextField id="quote-company" label="Công ty / Cửa hàng" autoComplete="organization" maxLength={160} {...bind("company")} />
              <TextField id="quote-taxCode" label="Mã số thuế" inputMode="numeric" autoComplete="off" maxLength={20} {...bind("taxCode")} />
            </div>
            <TextField id="quote-note" label="Yêu cầu thêm" multiline maxLength={1000} placeholder="VD: cần xuất hóa đơn VAT" {...bind("note")} />
            <Honeypot value={website} onChange={setWebsite} />
            <button className="btn btn-pri btn-lg btn-block" type="submit" disabled={submitting || count === 0} aria-busy={submitting}>
              {submitting ? "Đang gửi..." : "Gửi yêu cầu báo giá"}
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}

function QuoteSent({ quote }: { quote: QuoteView }) {
  return (
    <div className="done-box" role="status">
      <h1 style={{ font: "700 18px/1.3 Inter" }}>Đã gửi yêu cầu báo giá</h1>
      <div>
        <p className="muted">Mã báo giá</p>
        <span className="done-code">{quote.code}</span>
      </div>
      <p>Nhân viên sẽ liên hệ qua số điện thoại Quý khách đã nhập. Vui lòng giữ lại mã báo giá để trao đổi.</p>
      <div className="done-acts">
        <Link className="btn btn-pri" href="/">
          Tiếp tục xem sản phẩm
        </Link>
      </div>
    </div>
  );
}
