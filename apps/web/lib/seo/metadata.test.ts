import { describe, expect, it } from "vitest";
import { buildTrail, pageMetadata } from "./metadata";

describe("buildTrail", () => {
  it("starts at home, keeps the api crumbs and ends with the current page once", () => {
    const trail = buildTrail(
      [
        { name: "Trang chủ", href: "/" },
        { name: "Giấy", href: "/danh-muc/giay" },
        { name: "Giấy ăn", href: "/san-pham/giay-an" },
      ],
      { name: "Giấy ăn", href: "/san-pham/giay-an" },
    );
    expect(trail.map((c) => c.name)).toEqual(["Trang chủ", "Giấy", "Giấy ăn"]);
  });
});

describe("pageMetadata", () => {
  it("sets the canonical path and robots only when asked", () => {
    const indexed = pageMetadata({ title: "Giấy", path: "/danh-muc/giay" });
    expect(indexed.alternates?.canonical).toBe("/danh-muc/giay");
    expect(indexed.robots).toBeUndefined();
    const hidden = pageMetadata({ title: "Tìm", path: "/tim-kiem", noindex: true });
    expect(hidden.robots).toEqual({ index: false, follow: true });
  });
});
