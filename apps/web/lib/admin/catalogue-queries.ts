"use client";

import { useQuery } from "@tanstack/react-query";
import { catalogueApi } from "./catalogue-api";

export const catalogueKeys = {
  categories: ["admin", "categories"] as const,
  brands: ["admin", "brands"] as const,
  settings: ["admin", "settings"] as const,
  counters: ["admin", "request-counters"] as const,
};

export function useCategories() {
  return useQuery({ queryKey: catalogueKeys.categories, queryFn: () => catalogueApi.listCategories(), staleTime: 30_000 });
}

export function useBrands() {
  return useQuery({ queryKey: catalogueKeys.brands, queryFn: () => catalogueApi.listBrands(), staleTime: 30_000 });
}

/** Admin settings (price mismatch threshold). Can be refused for non-managers; callers fall back to the server's own warnings. */
export function useAdminSettings() {
  return useQuery({ queryKey: catalogueKeys.settings, queryFn: () => catalogueApi.getSettings(), staleTime: 60_000 });
}
