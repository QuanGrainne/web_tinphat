import { describe, expect, it } from "vitest";
import { safeNextPath } from "./login-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin admin paths with query strings", () => {
    expect(safeNextPath("/admin/products")).toBe("/admin/products");
    expect(safeNextPath("/admin/requests?status=NEW&page=2")).toBe("/admin/requests?status=NEW&page=2");
    expect(safeNextPath("/admin")).toBe("/admin");
  });

  it("falls back to the product list for anything else", () => {
    for (const bad of [null, undefined, "", "/", "/products", "//evil.example/admin", "https://evil.example/admin", "/adminx", "/admin\\..\\evil", "javascript:alert(1)", "/admin/login", "/admin/login?next=/admin"]) {
      expect(safeNextPath(bad)).toBe("/admin/products");
    }
  });
});
