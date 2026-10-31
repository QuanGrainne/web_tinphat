import { describe, expect, it } from "vitest";
import { bankTransactionsPath } from "./bank-transactions-api";
import { internalNotePath, parseRequestFilters, requestListPath, toQueryString } from "./requests-api";

describe("toQueryString", () => {
  it("skips undefined, null and blank values", () => {
    expect(toQueryString({ a: 1, b: undefined, c: null, d: "  ", e: "x" })).toBe("?a=1&e=x");
  });

  it("returns an empty string with no params", () => {
    expect(toQueryString({})).toBe("");
  });

  it("encodes text safely", () => {
    expect(toQueryString({ q: "a&b=c" })).toBe("?q=a%26b%3Dc");
  });
});

describe("requestListPath", () => {
  it("always sends page and size", () => {
    expect(requestListPath({}, 1)).toBe("/api/admin/requests?page=1&size=30");
  });

  it("sends only the filters that are set", () => {
    expect(requestListPath({ kind: "ORDER", status: "PENDING", payment: "BANK_TRANSFER", q: " DNA7K2 " }, 2)).toBe(
      "/api/admin/requests?kind=ORDER&status=PENDING&payment=BANK_TRANSFER&q=DNA7K2&page=2&size=30",
    );
  });

  it("supports the narrow order search used by the bank link dialog", () => {
    expect(requestListPath({ kind: "ORDER", q: "DNA7K2M9Q" }, 1, 10)).toBe("/api/admin/requests?kind=ORDER&q=DNA7K2M9Q&page=1&size=10");
  });
});

describe("bankTransactionsPath", () => {
  it("filters by status and pages by 30", () => {
    expect(bankTransactionsPath("REVIEW", 1)).toBe("/api/admin/bank-transactions?status=REVIEW&page=1&size=30");
    expect(bankTransactionsPath("MATCHED", 3)).toBe("/api/admin/bank-transactions?status=MATCHED&page=3&size=30");
  });
});

describe("internalNotePath", () => {
  it("uses the plural kind segment", () => {
    expect(internalNotePath("orders", 7)).toBe("/api/admin/requests/orders/7/internal-note");
    expect(internalNotePath("quotes", 9)).toBe("/api/admin/requests/quotes/9/internal-note");
  });
});

describe("parseRequestFilters", () => {
  it("reads known filters from the page URL", () => {
    expect(parseRequestFilters({ kind: "ORDER", status: "CONFIRMED", payment: "COD", q: " DNA3F " })).toEqual({
      kind: "ORDER",
      status: "CONFIRMED",
      payment: "COD",
      q: "DNA3F",
    });
  });

  it("drops values that do not belong", () => {
    expect(parseRequestFilters({ kind: "OTHER", status: "NOPE", payment: "CARD" })).toEqual({});
  });

  it("drops a status that does not fit the kind", () => {
    expect(parseRequestFilters({ kind: "QUOTE", status: "PENDING" })).toEqual({ kind: "QUOTE" });
    expect(parseRequestFilters({ kind: "ORDER", status: "NEW" })).toEqual({ kind: "ORDER" });
  });

  it("accepts either kind's status while the kind is open", () => {
    expect(parseRequestFilters({ status: "NEW" })).toEqual({ status: "NEW" });
    expect(parseRequestFilters({ status: "PENDING" })).toEqual({ status: "PENDING" });
  });

  it("ignores payment for quotes and takes the first of repeated params", () => {
    expect(parseRequestFilters({ kind: "QUOTE", payment: "COD" })).toEqual({ kind: "QUOTE" });
    expect(parseRequestFilters({ kind: ["ORDER", "QUOTE"] })).toEqual({ kind: "ORDER" });
  });

  it("caps the search text", () => {
    expect(parseRequestFilters({ q: "x".repeat(300) }).q).toHaveLength(100);
  });
});
