import { ProblemError } from "@/lib/api/public-post";
import { RateLimitedError } from "./public-request";

export interface ProblemView {
  status: number;
  code: string;
  /** One short Vietnamese line for the alert box. */
  message: string;
  /** Messages the API attached to form fields, keyed by the field names the caller listed. */
  fieldErrors: Record<string, string>;
  retryAfterSeconds: number | null;
}

const GENERIC = "Có lỗi xảy ra. Vui lòng thử lại.";

/** "lines[0].qty" -> "lines". */
function baseField(field: string): string {
  return field.split(/[.[]/, 1)[0];
}

export function formatWait(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.ceil(seconds))} giây`;
  return `${Math.ceil(seconds / 60)} phút`;
}

/** Turns anything thrown by a public request into text the customer can act on. */
export function describeProblem(err: unknown, knownFields: readonly string[] = []): ProblemView {
  if (!(err instanceof ProblemError)) {
    return { status: 0, code: "INTERNAL", message: GENERIC, fieldErrors: {}, retryAfterSeconds: null };
  }
  const fieldErrors: Record<string, string> = {};
  const stray: string[] = [];
  for (const item of err.problem.errors ?? []) {
    const key = baseField(item.field);
    if (knownFields.includes(key)) fieldErrors[key] ??= item.message;
    else stray.push(item.message);
  }
  const retryAfterSeconds = err instanceof RateLimitedError ? err.retryAfterSeconds : null;
  const detail = err.problem.detail?.trim() || GENERIC;

  let message: string;
  if (err.status === 429) {
    message = `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${retryAfterSeconds ? formatWait(retryAfterSeconds) : "ít phút"}.`;
  } else if (err.code === "VALIDATION_FAILED" || err.status === 400) {
    message = Object.keys(fieldErrors).length > 0 ? "Vui lòng kiểm tra lại các ô được đánh dấu." : [detail, ...stray].join(" ");
  } else if (err.code === "SKU_NOT_ORDERABLE") {
    message = "Có sản phẩm không thể đặt hàng. Vui lòng xóa khỏi giỏ hàng hoặc chuyển sang báo giá.";
  } else if (err.status >= 500) {
    message = "Hệ thống đang bận. Vui lòng thử lại sau ít phút.";
  } else {
    message = detail;
  }
  return { status: err.status, code: err.code, message, fieldErrors, retryAfterSeconds };
}
