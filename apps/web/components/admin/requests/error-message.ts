import { ApiProblem } from "@/lib/admin/api-client";

const FALLBACK = "Có lỗi xảy ra. Vui lòng thử lại.";

/** Vietnamese text for an error shown to staff: the server `detail` when there is one. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiProblem) return error.problem.detail || FALLBACK;
  return FALLBACK;
}

/** Problems that mean the data on screen is stale (state changed elsewhere): reload it after showing the message. */
export function isStateConflict(error: unknown): boolean {
  return error instanceof ApiProblem && (error.status === 409 || error.status === 422);
}
