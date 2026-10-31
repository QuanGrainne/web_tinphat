import { describe, expect, it } from "vitest";
import type { AdminProduct, AdminSku } from "@/lib/api/types";
import {
  buildProductPayload,
  describeMissing,
  newProduct,
  parseFieldPath,
  readMissing,
  toFormValues,
} from "./catalogue-form";

function sku(over: Partial<AdminSku>): AdminSku {
  return {
    id: 1, version: 3, code: "SV465-4L- Gói", name: null, unitName: "Gói", conversion: 1, isBase: true,
    price: 5330, priceVisible: true, needsConfirmation: false,
    promoPrice: null, promoFrom: null, promoTo: null,
    visible: true, source: "SEED", perBaseUnit: 5330, warnings: [],
    ...over,
  };
}

/** The server-computed, read-only SKU fields are not part of what the form sends. */
function writableFields(s: AdminSku): Omit<AdminSku, "perBaseUnit" | "warnings"> {
  const copy: Partial<AdminSku> = { ...s };
  delete copy.perBaseUnit;
  delete copy.warnings;
  return copy as Omit<AdminSku, "perBaseUnit" | "warnings">;
}

const loaded: AdminProduct = {
  id: 7, version: 5, name: "Giấy khăn giấy rút", slug: "giay-khan-giay-rut",
  brandId: 2, categoryId: 4, descriptionMd: null, specLine: "465 tờ", imageUrl: null,
  seoTitle: null, seoDescription: null, internalNote: null, published: false, status: "ACTIVE",
  skus: [
    sku({}),
    sku({ id: 2, code: "SV465-4L- T80", unitName: "Thùng", conversion: 80, isBase: false, price: 440000, priceVisible: false, needsConfirmation: true, promoPrice: 400000, promoFrom: "2026-11-01", promoTo: "2026-11-30" }),
  ],
  warnings: [],
  priceHistory: [],
};

describe("buildProductPayload", () => {
  it("round-trips every SKU field untouched (dates, flags, versions)", () => {
    const payload = buildProductPayload(toFormValues(loaded), loaded, true);
    expect(payload.id).toBe(7);
    expect(payload.version).toBe(5);
    expect(payload.slug).toBe("giay-khan-giay-rut");
    expect(payload.skus.map(writableFields)).toEqual(loaded.skus.map(writableFields));
  });

  it("copies protected fields from the loaded SKU when the caller may not edit prices", () => {
    const values = toFormValues(loaded);
    values.skus[1].price = 1;
    values.skus[1].code = "HACK";
    values.skus[1].conversion = 2;
    values.skus[1].priceVisible = true;
    values.skus[1].needsConfirmation = false;
    values.skus[1].promoPrice = null;
    values.skus[1].promoFrom = null;
    values.skus[1].visible = false;
    values.name = "  Tên mới  ";
    const payload = buildProductPayload(values, loaded, false);
    expect(payload.name).toBe("Tên mới");
    const thung = payload.skus[1];
    expect(thung.price).toBe(440000);
    expect(thung.code).toBe("SV465-4L- T80");
    expect(thung.conversion).toBe(80);
    expect(thung.priceVisible).toBe(false);
    expect(thung.needsConfirmation).toBe(true);
    expect(thung.promoPrice).toBe(400000);
    expect(thung.promoFrom).toBe("2026-11-01");
    expect(thung.visible).toBe(false); // visibility is not a protected field
  });

  it("turns blank optional text into null and keeps published/status as loaded", () => {
    const values = toFormValues(loaded);
    values.specLine = "   ";
    values.imageUrl = "";
    values.internalNote = null;
    const payload = buildProductPayload(values, loaded, true);
    expect(payload.specLine).toBeNull();
    expect(payload.imageUrl).toBeNull();
    expect(payload.internalNote).toBeNull();
    expect(payload.published).toBe(false);
    expect(payload.status).toBe("ACTIVE");
  });

  it("builds a create body with null ids from the blank aggregate", () => {
    const blank = newProduct();
    const values = toFormValues(blank);
    values.name = "Sản phẩm mới";
    values.skus[0].unitName = "Gói";
    values.skus[0].code = " SP-001 ";
    values.skus[0].price = 1000;
    const payload = buildProductPayload(values, blank, true);
    expect(payload.id).toBeNull();
    expect(payload.version).toBeNull();
    expect(payload.skus).toHaveLength(1);
    expect(payload.skus[0]).toMatchObject({ id: null, version: null, code: "SP-001", isBase: true, conversion: 1, price: 1000, source: "MANUAL" });
  });
});

describe("parseFieldPath", () => {
  it("splits bracket and dot notation", () => {
    expect(parseFieldPath("name")).toEqual(["name"]);
    expect(parseFieldPath("skus[1].price")).toEqual(["skus", 1, "price"]);
    expect(parseFieldPath("skus.0.code")).toEqual(["skus", 0, "code"]);
  });
});

describe("publish requirements", () => {
  it("labels known codes and passes server text through", () => {
    expect(describeMissing("CATEGORY")).toBe("Nhóm hàng");
    expect(describeMissing("Cần ít nhất một quy cách có giá")).toBe("Cần ít nhất một quy cách có giá");
  });

  it("reads the missing extension and ignores anything else", () => {
    expect(readMissing({ missing: ["CATEGORY", "x", 5] })).toEqual(["Nhóm hàng", "x"]);
    expect(readMissing({ missing: "CATEGORY" })).toEqual([]);
    expect(readMissing({})).toEqual([]);
  });
});
