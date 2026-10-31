import { describe, expect, it } from "vitest";
import { listingHref, pageWindow, parsePage, parseSort, toArray } from "./listing-url";

describe("listing-url", () => {
  it("omits defaults so the base url stays canonical", () => {
    expect(listingHref("/danh-muc/giay", {})).toBe("/danh-muc/giay");
    expect(listingHref("/danh-muc/giay", { sort: "name_asc", page: 1 })).toBe("/danh-muc/giay");
  });

  it("keeps repeated brand params, sort and page", () => {
    expect(listingHref("/danh-muc/giay", { brand: ["sen-vang", "gp"], sort: "price_asc", page: 3 })).toBe(
      "/danh-muc/giay?brand=sen-vang&brand=gp&sort=price_asc&page=3",
    );
  });

  it("parses unsafe input to safe values", () => {
    expect(parseSort("drop table")).toBe("name_asc");
    expect(parseSort("price_desc")).toBe("price_desc");
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("7")).toBe(7);
    expect(toArray(["a", " ", "b"])).toEqual(["a", "b"]);
    expect(toArray(undefined)).toEqual([]);
  });

  it("builds a page window with gaps", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([1, null, 4, 5, 6, null, 10]);
    expect(pageWindow(2, 10)).toEqual([1, 2, 3, null, 10]);
  });
});
