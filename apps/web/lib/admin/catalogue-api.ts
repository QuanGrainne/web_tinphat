import { adminDownload, adminFetch } from "./api-client";
import type {
  AdminBrand,
  AdminCategory,
  AdminProduct,
  AdminProductList,
  AdminSettings,
  RequestCounters,
} from "@/lib/api/types";

type QueryValue = string | number | boolean | null | undefined;

/** Appends non-empty values as a query string; empty strings, null and undefined are dropped. */
export function withQuery(path: string, query: Record<string, QueryValue>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export interface ProductListQuery {
  q?: string;
  categoryId?: number;
  brandId?: number;
  published?: boolean;
  needsAttention?: boolean;
  page: number;
  size: number;
}

export interface ImportPreviewRow {
  row: number; code: string; name: string; category: string; price: number | null; unit: string;
  imageUrl: string | null; imageCount: number; action: "CREATE" | "UPDATE" | "SKIP" | "ERROR"; message: string | null;
}
export interface ImportPreview { rows: ImportPreviewRow[]; create: number; update: number; skip: number; error: number }
export interface ImportResult { created: number; updated: number; skipped: number; errors: { row: number; code: string; message: string }[] }

function fileForm(file: File): FormData {
  const multipart = new FormData();
  multipart.append("file", file);
  return multipart;
}

export interface CategoryCreate { name: string; parentId?: number | null; description: string | null; imageUrl: string | null }
export interface CategoryUpdate { name: string; description: string | null; imageUrl: string | null; visible: boolean; sortOrder: number }
export interface BrandUpdate { name: string; visible: boolean }

export const catalogueApi = {
  listProducts: (query: ProductListQuery) =>
    adminFetch<AdminProductList>(
      withQuery("/api/admin/products", {
        q: query.q?.trim(),
        categoryId: query.categoryId,
        brandId: query.brandId,
        published: query.published,
        needsAttention: query.needsAttention,
        page: query.page,
        size: query.size,
      }),
    ),
  nextProductCode: () => adminFetch<{ code: string }>("/api/admin/products/next-code"),
  getProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}`),
  createProduct: (body: AdminProduct) => adminFetch<AdminProduct>("/api/admin/products", { method: "POST", body }),
  updateProduct: (id: number, body: AdminProduct) =>
    adminFetch<AdminProduct>(`/api/admin/products/${id}`, { method: "PUT", body }),
  publishProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/publish`, { method: "POST" }),
  unpublishProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/unpublish`, { method: "POST" }),
  discontinueProduct: (id: number) =>
    adminFetch<AdminProduct>(`/api/admin/products/${id}/discontinue`, { method: "POST" }),
  reactivateProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/reactivate`, { method: "POST" }),

  uploadImage: (file: File) => {
    const multipart = new FormData();
    multipart.append("file", file);
    return adminFetch<{ url: string }>("/api/admin/uploads/images", { multipart });
  },
  deleteProducts: (ids: number[]) =>
    adminFetch<{ deleted: number; blocked: { id: number; message: string }[] }>("/api/admin/products/delete", { method: "POST", body: { ids } }),
  exportProducts: (ids: number[]) => adminDownload("/api/admin/exports/products", { ids }, "san-pham-tin-phat.xlsx"),
  previewImport: (file: File, categoryId: number | null) =>
    adminFetch<ImportPreview>(`/api/admin/imports/products/preview${categoryId ? `?categoryId=${categoryId}` : ""}`, { multipart: fileForm(file) }),
  runImport: (file: File, options: { categoryId: number | null; publish: boolean; update: boolean }) => {
    const query = new URLSearchParams({ publish: String(options.publish), update: String(options.update) });
    if (options.categoryId) query.set("categoryId", String(options.categoryId));
    return adminFetch<ImportResult>(`/api/admin/imports/products?${query}`, { multipart: fileForm(file) });
  },
  listCategories: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  createCategory: (body: CategoryCreate) => adminFetch<AdminCategory>("/api/admin/categories", { method: "POST", body }),
  deleteCategory: (id: number) => adminFetch<void>(`/api/admin/categories/${id}`, { method: "DELETE" }),
  updateCategory: (id: number, body: CategoryUpdate) =>
    adminFetch<AdminCategory>(`/api/admin/categories/${id}`, { method: "PUT", body }),

  listBrands: () => adminFetch<AdminBrand[]>("/api/admin/brands"),
  createBrand: (body: { name: string }) => adminFetch<AdminBrand>("/api/admin/brands", { method: "POST", body }),
  updateBrand: (id: number, body: BrandUpdate) => adminFetch<AdminBrand>(`/api/admin/brands/${id}`, { method: "PUT", body }),

  getSettings: () => adminFetch<AdminSettings>("/api/admin/settings"),
  getRequestCounters: () => adminFetch<RequestCounters>("/api/admin/requests/counters"),
};
