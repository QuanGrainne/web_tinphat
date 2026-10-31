import dayjs, { type Dayjs } from "dayjs";
import type { AdminProduct, AdminSku } from "@/lib/api/types";

/** Form-side shape of one SKU row (promo dates are dayjs objects for the date pickers). */
export interface SkuFormRow {
  id: number | null;
  version: number | null;
  code: string;
  name: string | null;
  unitName: string;
  conversion: number | null;
  isBase: boolean;
  price: number | null;
  priceVisible: boolean;
  needsConfirmation: boolean;
  promoPrice: number | null;
  promoFrom: Dayjs | null;
  promoTo: Dayjs | null;
  visible: boolean;
  source: AdminSku["source"];
}

export interface ProductFormValues {
  name: string;
  brandId: number | null;
  categoryId: number | null;
  specLine: string | null;
  imageUrl: string | null;
  internalNote: string | null;
  descriptionMd: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  skus: SkuFormRow[];
}

const DATE_FORMAT = "YYYY-MM-DD";

function toDayjs(value: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value, DATE_FORMAT, true);
  return parsed.isValid() ? parsed : null;
}

function toDateString(value: Dayjs | null | undefined): string | null {
  return value && value.isValid() ? value.format(DATE_FORMAT) : null;
}

function trimToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function newSkuRow(isBase: boolean): SkuFormRow {
  return {
    id: null,
    version: null,
    code: "",
    name: null,
    unitName: "",
    conversion: isBase ? 1 : null,
    isBase,
    price: null,
    priceVisible: true,
    needsConfirmation: false,
    promoPrice: null,
    promoFrom: null,
    promoTo: null,
    visible: true,
    source: "MANUAL",
  };
}

/** Blank aggregate for "Tạo mới": one base row, not published. */
export function newProduct(): AdminProduct {
  return {
    id: null,
    version: null,
    name: "",
    slug: "",
    brandId: null,
    categoryId: null,
    descriptionMd: null,
    specLine: null,
    imageUrl: null,
    seoTitle: null,
    seoDescription: null,
    internalNote: null,
    published: false,
    status: "ACTIVE",
    skus: [skuToApi(newSkuRow(true))],
    warnings: [],
    priceHistory: [],
  };
}

function skuToApi(row: SkuFormRow): AdminSku {
  return {
    id: row.id,
    version: row.version,
    code: row.code.trim(),
    name: row.name,
    unitName: row.unitName.trim(),
    conversion: row.conversion ?? 1,
    isBase: row.isBase,
    price: row.price,
    priceVisible: row.priceVisible,
    needsConfirmation: row.needsConfirmation,
    promoPrice: row.promoPrice,
    promoFrom: toDateString(row.promoFrom),
    promoTo: toDateString(row.promoTo),
    visible: row.visible,
    source: row.source,
    perBaseUnit: null,
    warnings: [],
  };
}

export function toFormValues(product: AdminProduct): ProductFormValues {
  return {
    name: product.name,
    brandId: product.brandId,
    categoryId: product.categoryId,
    specLine: product.specLine,
    imageUrl: product.imageUrl,
    internalNote: product.internalNote,
    descriptionMd: product.descriptionMd,
    seoTitle: product.seoTitle,
    seoDescription: product.seoDescription,
    skus: product.skus.map((sku) => ({
      id: sku.id,
      version: sku.version,
      code: sku.code,
      name: sku.name,
      unitName: sku.unitName,
      conversion: sku.conversion,
      isBase: sku.isBase,
      price: sku.price,
      priceVisible: sku.priceVisible,
      needsConfirmation: sku.needsConfirmation,
      promoPrice: sku.promoPrice,
      promoFrom: toDayjs(sku.promoFrom),
      promoTo: toDayjs(sku.promoTo),
      visible: sku.visible,
      source: sku.source,
    })),
  };
}

/**
 * Builds the PUT/POST body from the form. Fields an EDITOR may not touch (price, price visibility, flag, promo,
 * conversion, code, base marker) are copied from the loaded SKU so the server never sees a change to them.
 */
export function buildProductPayload(values: ProductFormValues, original: AdminProduct, canEditPrice: boolean): AdminProduct {
  const originalSkus = new Map<number, AdminSku>();
  for (const sku of original.skus) if (sku.id !== null) originalSkus.set(sku.id, sku);

  const skus = values.skus.map((row) => {
    const fromForm = skuToApi(row);
    const loaded = row.id !== null ? originalSkus.get(row.id) : undefined;
    if (canEditPrice || !loaded) return fromForm;
    return {
      ...fromForm,
      code: loaded.code,
      conversion: loaded.conversion,
      isBase: loaded.isBase,
      price: loaded.price,
      priceVisible: loaded.priceVisible,
      needsConfirmation: loaded.needsConfirmation,
      promoPrice: loaded.promoPrice,
      promoFrom: loaded.promoFrom,
      promoTo: loaded.promoTo,
    };
  });

  return {
    id: original.id,
    version: original.version,
    name: values.name.trim(),
    slug: original.slug,
    brandId: values.brandId ?? null,
    categoryId: values.categoryId ?? null,
    descriptionMd: values.descriptionMd?.trim() ? values.descriptionMd : null,
    specLine: trimToNull(values.specLine),
    imageUrl: trimToNull(values.imageUrl),
    seoTitle: trimToNull(values.seoTitle),
    seoDescription: trimToNull(values.seoDescription),
    internalNote: trimToNull(values.internalNote),
    published: original.published,
    status: original.status,
    skus,
    warnings: [],
    priceHistory: [],
  };
}

/** "skus[1].price" / "skus.1.price" -> ["skus", 1, "price"] so server field errors can be attached to form fields. */
export function parseFieldPath(field: string): (string | number)[] {
  const path: (string | number)[] = [];
  for (const match of field.matchAll(/([^.[\]]+)|\[(\d+)\]/g)) {
    const token = match[2] ?? match[1];
    path.push(/^\d+$/.test(token) ? Number(token) : token);
  }
  return path;
}

const MISSING_LABELS: Record<string, string> = {
  CATEGORY: "Nhóm hàng",
  CATEGORY_ID: "Nhóm hàng",
  PRICED_SKU: "Ít nhất một quy cách đang hiện và có giá",
  VISIBLE_PRICED_SKU: "Ít nhất một quy cách đang hiện và có giá",
  SKU: "Ít nhất một quy cách đang hiện và có giá",
};

/** `missing[]` of a publish refusal: server text is shown as is, known codes get a Vietnamese label. */
export function describeMissing(item: string): string {
  return MISSING_LABELS[item.trim().toUpperCase()] ?? item;
}

/** Reads the `missing: string[]` extension of a PUBLISH_REQUIREMENTS_UNMET problem. */
export function readMissing(problem: { [extension: string]: unknown }): string[] {
  const value = problem.missing;
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map(describeMissing) : [];
}
