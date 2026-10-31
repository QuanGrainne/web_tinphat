import type { AdminSession, ProblemBody } from "@/lib/api/types";

/** Non-2xx answer from an admin endpoint (application/problem+json). */
export class ApiProblem extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemBody,
  ) {
    super(problem.detail);
    this.name = "ApiProblem";
  }
  get code(): string {
    return this.problem.code;
  }
  get fieldErrors(): { field: string; message: string }[] {
    return this.problem.errors ?? [];
  }
}

export const VERSION_CONFLICT_MESSAGE = "Dữ liệu đã bị người khác thay đổi. Tải lại để tiếp tục.";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrf(): Promise<string> {
  let token = readCookie("XSRF-TOKEN");
  if (!token) {
    await fetch("/api/auth/csrf", { credentials: "same-origin", cache: "no-store" });
    token = readCookie("XSRF-TOKEN");
  }
  return token ?? "";
}

async function toProblem(res: Response): Promise<ApiProblem> {
  let problem: ProblemBody;
  try {
    problem = (await res.json()) as ProblemBody;
    if (typeof problem.detail !== "string") throw new Error("not a problem body");
  } catch {
    problem = { status: res.status, code: "INTERNAL", detail: "Có lỗi xảy ra. Vui lòng thử lại." };
  }
  return new ApiProblem(res.status, problem);
}

export interface AdminRequestInit {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  /** JSON body. */
  body?: unknown;
  /** Form-urlencoded body (login). */
  form?: Record<string, string>;
  /** Do not redirect to the login page on 401 (login form, session probe). */
  noRedirect?: boolean;
}

/**
 * Browser-side call to /api/** with the session cookie and CSRF header.
 * 401 sends the user to /admin/login?next=... unless `noRedirect`. 204 resolves to undefined.
 */
export async function adminFetch<T = void>(path: string, init: AdminRequestInit = {}): Promise<T> {
  const method = init.method ?? (init.body !== undefined || init.form ? "POST" : "GET");
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-XSRF-TOKEN"] = await ensureCsrf();

  let body: BodyInit | undefined;
  if (init.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  } else if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.body);
  }

  let res: Response;
  try {
    res = await fetch(path, { method, headers, body, credentials: "same-origin", cache: "no-store" });
  } catch {
    throw new ApiProblem(0, { status: 0, code: "NETWORK", detail: "Không kết nối được máy chủ. Vui lòng thử lại." });
  }

  if (res.status === 401 && !init.noRedirect && typeof window !== "undefined") {
    const next = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.assign(`/admin/login?next=${next}`);
  }
  if (!res.ok) throw await toProblem(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const adminApi = {
  login: (username: string, password: string) =>
    adminFetch<AdminSession>("/api/auth/login", { form: { username, password }, noRedirect: true }),
  logout: () => adminFetch<void>("/api/auth/logout", { method: "POST" }),
  me: () => adminFetch<AdminSession>("/api/admin/me", { noRedirect: true }),
};
