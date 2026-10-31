import { describe, expect, it } from "vitest";
import { withQuery } from "./catalogue-api";

describe("withQuery", () => {
  it("keeps set values and drops empty ones", () => {
    expect(
      withQuery("/api/admin/products", { q: "giấy", categoryId: 3, brandId: undefined, published: false, needsAttention: undefined, page: 1, size: 30 }),
    ).toBe("/api/admin/products?q=gi%E1%BA%A5y&categoryId=3&published=false&page=1&size=30");
  });

  it("returns the bare path when nothing is set", () => {
    expect(withQuery("/api/admin/brands", { q: "", page: undefined })).toBe("/api/admin/brands");
  });
});
