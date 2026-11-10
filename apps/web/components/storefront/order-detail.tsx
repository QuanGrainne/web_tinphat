"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ProblemError } from "@/lib/api/public-post";
import type { OrderView, PaymentMethod } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { recallPhone } from "@/lib/order/last-order";
import { formatDateTimeVn } from "@/lib/order/format-time";
import { isOrderCode, normalizeOrderCode } from "@/lib/order/order-code";
import { describeProblem } from "@/lib/order/problem-view";
import { postPublic } from "@/lib/order/public-request";
import { Alert } from "./form-field";
import { BankTransferBlock } from "./bank-transfer-block";
import { LookupForm } from "./lookup-form";
import { OrderStatusSteps, StatusChip } from "./order-status-steps";

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng (COD)",
  BANK_TRANSFER: "Chuyển khoản",
};
const NOT_FOUND =
  "Không tìm thấy đơn hàng. Vui lòng kiểm tra mã đơn và số điện thoại.";
const REFETCH_AFTER_MS = 20_000;

type Failure = { kind: "not-found" } | { kind: "error"; message: string };
interface Result {
  id: string;
  fetchKey: string;
  order?: OrderView;
  failure?: Failure;
}

const noSubscription = () => () => {};

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toFailure(err: unknown): Failure {
  if (err instanceof ProblemError && (err.status === 404 || err.status === 400))
    return { kind: "not-found" };
  return { kind: "error", message: describeProblem(err).message };
}

/** Order page body. Looks the order up with the code from the URL and the phone this tab remembers. */
export function OrderDetail({ code }: { code: string }) {
  const router = useRouter();
  const normalized = normalizeOrderCode(safeDecode(code));
  const valid = isOrderCode(normalized);
  // undefined while rendering on the server / hydrating, then the stored phone or null
  const storedPhone = useSyncExternalStore(
    noSubscription,
    () => recallPhone(normalized),
    () => undefined,
  );
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const lastFetch = useRef(0);

  const id = `${normalized}|${storedPhone}`;
  const fetchKey = `${id}|${reload}`;

  useEffect(() => {
    if (!valid || !storedPhone) return;
    let stale = false;
    lastFetch.current = Date.now();
    postPublic<OrderView>("/api/public/orders/lookup", {
      code: normalized,
      phone: storedPhone,
    })
      .then(({ data }) => {
        if (!stale) setResult({ id, fetchKey, order: data });
      })
      .catch((err: unknown) => {
        if (!stale) setResult({ id, fetchKey, failure: toFailure(err) });
      });
    return () => {
      stale = true;
    };
  }, [valid, normalized, storedPhone, id, fetchKey]);

  // Coming back to the tab (for example after paying) refreshes the order.
  useEffect(() => {
    const onVisible = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastFetch.current > REFETCH_AFTER_MS
      ) {
        setReload((n) => n + 1);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const refresh = () => setReload((n) => n + 1);
  const openCode = (next: string) =>
    next === normalized ? refresh() : router.push(`/don-hang/${next}`);
  const current = result?.id === id ? result : null;
  const refreshing = current !== null && current.fetchKey !== fetchKey;

  if (storedPhone === undefined) return <Loading />;

  if (current?.order) {
    return (
      <OrderBody
        order={current.order}
        refreshing={refreshing}
        onRefresh={refresh}
        onLookup={openCode}
      />
    );
  }

  if (!valid || (current?.failure?.kind === "not-found" && !refreshing)) {
    return (
      <Lookup
        title="Không tìm thấy đơn"
        code={valid ? normalized : ""}
        onLookup={openCode}
      >
        <Alert tone="err">{NOT_FOUND}</Alert>
      </Lookup>
    );
  }

  if (storedPhone === null) {
    return (
      <Lookup title="Tra cứu đơn" code={normalized} onLookup={openCode}>
        <Alert tone="info">
          Nhập số điện thoại đã dùng khi đặt hàng để xem đơn {normalized}.
        </Alert>
      </Lookup>
    );
  }

  if (current?.failure?.kind === "error" && !refreshing) {
    return (
      <Lookup title="Không tải được đơn" code={normalized} onLookup={openCode}>
        <Alert tone="err">
          {current.failure.message}{" "}
          <button type="button" className="btn-text" onClick={refresh}>
            Thử lại
          </button>
        </Alert>
      </Lookup>
    );
  }

  return <Loading />;
}

function Loading() {
  return (
    <div className="stack" aria-busy="true">
      <h1 style={{ font: "700 20px/1.2 Inter" }}>Đơn hàng</h1>
      <p className="muted" role="status">
        Đang tải đơn hàng...
      </p>
    </div>
  );
}

function Lookup({
  title,
  code,
  onLookup,
  children,
}: {
  title: string;
  code: string;
  onLookup: (code: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="stack" style={{ maxWidth: 480 }}>
      <h1 style={{ font: "700 20px/1.2 Inter" }}>{title}</h1>
      {children}
      <LookupForm initialCode={code} onDone={onLookup} />
    </div>
  );
}

function OrderBody({
  order,
  refreshing,
  onRefresh,
  onLookup,
}: {
  order: OrderView;
  refreshing: boolean;
  onRefresh: () => void;
  onLookup: (code: string) => void;
}) {
  const cancelled = order.status === "CANCELLED";
  const placed = formatDateTimeVn(order.createdAt);
  return (
    <div className="cart">
      <section>
        <div className="ord-h">
          <h1>
            Đơn{" "}
            <span className="mono" style={{ fontSize: 18 }}>
              {order.code}
            </span>
          </h1>
          <StatusChip status={order.status} />
          <button
            type="button"
            className="btn-text rf"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing}
          >
            {refreshing ? "Đang cập nhật..." : "Làm mới"}
          </button>
        </div>
        {placed ? <p className="ord-meta">Đặt lúc {placed}</p> : null}
        {cancelled ? (
          <div className="cancel-box">
            <Alert tone="info" title="Đơn hàng đã hủy">
              Vui lòng liên hệ hotline nếu Quý khách cần hỗ trợ.
            </Alert>
          </div>
        ) : (
          <OrderStatusSteps
            method={order.paymentMethod}
            status={order.status}
          />
        )}

        <BankTransferBlock order={order} />

        <h2 className="box-t">Sản phẩm</h2>
        <div className="lines">
          {order.items.map((item) => (
            <div className="oi" key={`${item.skuCode}-${item.unitName}`}>
              <div>
                <b>{item.productName}</b>
                <span>
                  {item.unitName}
                  {item.conversion > 1
                    ? ` · quy đổi ${item.conversion}`
                    : ""} × {item.qty}
                </span>
                <span className="mono">{item.skuCode}</span>
              </div>
              <div className="t">{formatVnd(item.lineTotal)}</div>
            </div>
          ))}
        </div>

        <h2 className="box-t">Thông tin nhận hàng</h2>
        <div className="box">
          <dl className="kv">
            <dt>Họ tên</dt>
            <dd>{order.customerName}</dd>
            <dt>Điện thoại</dt>
            <dd>{order.phoneMasked}</dd>
            <dt>Thanh toán</dt>
            <dd>{PAYMENT_LABEL[order.paymentMethod]}</dd>
          </dl>
        </div>
      </section>
      <aside>
        <div className="box">
          <div className="sum-r">
            <span>Tổng tiền hàng</span>
            <b>{formatVnd(order.subtotal)}</b>
          </div>
          {order.discountTotal > 0 ? (
            <>
              <div className="sum-r">
                <span>Giảm đã áp</span>
                <b className="disc">-{formatVnd(order.discountTotal)}</b>
              </div>
              {order.discountNote ? (
                <p className="sum-note">{order.discountNote}</p>
              ) : null}
            </>
          ) : null}
          <div className="sum-r">
            <span>Phí giao hàng</span>
            {order.shippingFee !== null ? (
              <b>{formatVnd(order.shippingFee)}</b>
            ) : (
              <span className="muted">Nhân viên sẽ báo</span>
            )}
          </div>
          <div className="sum-r big">
            <span>Khách cần trả</span>
            <b>{formatVnd(order.total)}</b>
          </div>
          <div className="sum-r">
            <small>Giá đã gồm VAT</small>
          </div>
          {order.shippingFee === null && !cancelled ? (
            <p className="ord-note">
              Nhân viên xác nhận tồn kho, phí giao và tổng tiền
            </p>
          ) : null}
        </div>
        <div style={{ marginTop: 12 }}>
          <LookupForm onDone={onLookup} idPrefix="lookup-side" />
        </div>
      </aside>
    </div>
  );
}
