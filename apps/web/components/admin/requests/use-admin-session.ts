"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/api-client";
import type { AdminSession } from "@/lib/api/types";

/** Current admin user; `role` decides what MANAGER-only parts (bank review, bank settings) show. */
export function useAdminSession() {
  return useQuery<AdminSession>({
    queryKey: ["admin", "me"],
    queryFn: adminApi.me,
    staleTime: 5 * 60_000,
  });
}
