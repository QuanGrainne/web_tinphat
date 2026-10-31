import { describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/api/public-post";
import { describeProblem, formatWait } from "./problem-view";
import { RateLimitedError, parseRetryAfter } from "./public-request";

const FIELDS = ["customerName", "phone", "address"] as const;

describe("describeProblem", () => {
  it("maps API field errors to form fields and keeps the rest as a message", () => {
    const err = new ProblemError(400, {
      status: 400,
      code: "VALIDATION_FAILED",
      detail: "Dữ liệu chưa hợp lệ.",
      errors: [
        { field: "phone", message: "Số điện thoại chưa đúng." },
        { field: "phone", message: "second message is ignored" },
        { field: "lines[0].qty", message: "Số lượng từ 1 đến 9999." },
      ],
    });
    const view = describeProblem(err, FIELDS);
    expect(view.fieldErrors).toEqual({ phone: "Số điện thoại chưa đúng." });
    expect(view.message).toBe("Vui lòng kiểm tra lại các ô được đánh dấu.");
  });

  it("uses the API detail for a 400 without field errors, including the honeypot case", () => {
    const err = new ProblemError(400, { status: 400, code: "VALIDATION_FAILED", detail: "Yêu cầu không hợp lệ." });
    expect(describeProblem(err, FIELDS).message).toBe("Yêu cầu không hợp lệ.");
  });

  it("shows the Retry-After wait on 429", () => {
    const err = new RateLimitedError({ status: 429, code: "RATE_LIMITED", detail: "x" }, 90);
    const view = describeProblem(err);
    expect(view.retryAfterSeconds).toBe(90);
    expect(view.message).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau 2 phút.");
    const noWait = describeProblem(new ProblemError(429, { status: 429, code: "RATE_LIMITED", detail: "x" }));
    expect(noWait.message).toBe("Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.");
  });

  it("explains SKU_NOT_ORDERABLE and server errors", () => {
    const orderable = describeProblem(new ProblemError(422, { status: 422, code: "SKU_NOT_ORDERABLE", detail: "x" }));
    expect(orderable.message).toContain("chuyển sang báo giá");
    const server = describeProblem(new ProblemError(503, { status: 503, code: "INTERNAL", detail: "x" }));
    expect(server.message).toBe("Hệ thống đang bận. Vui lòng thử lại sau ít phút.");
  });

  it("keeps the network message and survives unknown errors", () => {
    const net = describeProblem(new ProblemError(0, { status: 0, code: "NETWORK", detail: "Không kết nối được máy chủ." }));
    expect(net.message).toBe("Không kết nối được máy chủ.");
    expect(describeProblem(new Error("boom")).message).toBe("Có lỗi xảy ra. Vui lòng thử lại.");
  });
});

describe("wait helpers", () => {
  it("formats seconds and minutes", () => {
    expect(formatWait(1)).toBe("1 giây");
    expect(formatWait(45)).toBe("45 giây");
    expect(formatWait(60)).toBe("1 phút");
    expect(formatWait(601)).toBe("11 phút");
  });

  it("parses Retry-After as seconds or an HTTP date", () => {
    expect(parseRetryAfter("120")).toBe(120);
    expect(parseRetryAfter(null)).toBeNull();
    expect(parseRetryAfter("soon")).toBeNull();
    const now = Date.parse("2026-10-31T10:00:00Z");
    expect(parseRetryAfter("Sat, 31 Oct 2026 10:01:30 GMT", now)).toBe(90);
  });
});
