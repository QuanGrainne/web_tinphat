"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminSession } from "@/lib/api/types";
import { adminApi, ApiProblem } from "./api-client";

export const SESSION_QUERY_KEY = ["admin", "me"] as const;

/** Current admin session. A 401 sends the browser to the login page (keeping the current path in `next`). */
export function useSession() {
  const query = useQuery<AdminSession, ApiProblem>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => adminApi.me(),
    staleTime: 5 * 60_000,
  });

  const unauthenticated = query.error instanceof ApiProblem && query.error.status === 401;
  useEffect(() => {
    if (!unauthenticated) return;
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/admin/login?next=${next}`);
  }, [unauthenticated]);

  return {
    session: query.data,
    isPending: query.isPending,
    error: query.error,
    unauthenticated,
    refetch: query.refetch,
    isManager: query.data?.role === "MANAGER",
  };
}
