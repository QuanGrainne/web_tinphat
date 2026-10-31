import { adminFetch } from "./api-client";
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

export interface CategoryCreate { name: string; parentId?: number | null }
export interface CategoryUpdate { name: string; description: string | null; visible: boolean; sortOrder: number }
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
  getProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}`),
  createProduct: (body: AdminProduct) => adminFetch<AdminProduct>("/api/admin/products", { method: "POST", body }),
  updateProduct: (id: number, body: AdminProduct) =>
    adminFetch<AdminProduct>(`/api/admin/products/${id}`, { method: "PUT", body }),
  publishProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/publish`, { method: "POST" }),
  unpublishProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/unpublish`, { method: "POST" }),
  discontinueProduct: (id: number) =>
    adminFetch<AdminProduct>(`/api/admin/products/${id}/discontinue`, { method: "POST" }),
  reactivateProduct: (id: number) => adminFetch<AdminProduct>(`/api/admin/products/${id}/reactivate`, { method: "POST" }),

  listCategories: () => adminFetch<AdminCategory[]>("/api/admin/categories"),
  createCategory: (body: CategoryCreate) => adminFetch<AdminCategory>("/api/admin/categories", { method: "POST", body }),
  updateCategory: (id: number, body: CategoryUpdate) =>
    adminFetch<AdminCategory>(`/api/admin/categories/${id}`, { method: "PUT", body }),

  listBrands: () => adminFetch<AdminBrand[]>("/api/admin/brands"),
  createBrand: (body: { name: string }) => adminFetch<AdminBrand>("/api/admin/brands", { method: "POST", body }),
  updateBrand: (id: number, body: BrandUpdate) => adminFetch<AdminBrand>(`/api/admin/brands/${id}`, { method: "PUT", body }),

  getSettings: () => adminFetch<AdminSettings>("/api/admin/settings"),
  getRequestCounters: () => adminFetch<RequestCounters>("/api/admin/requests/counters"),
};
