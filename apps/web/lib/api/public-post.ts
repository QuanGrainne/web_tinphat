import type { ProblemBody } from "./types";

/** Non-2xx answer from the API, parsed from application/problem+json when present. */
export class ProblemError extends Error {
  constructor(
    public readonly status: number,
    public readonly problem: ProblemBody,
  ) {
    super(problem.detail || `HTTP ${status}`);
    this.name = "ProblemError";
  }
  get code(): string {
    return this.problem.code;
  }
}

async function toProblem(res: Response): Promise<ProblemError> {
  let problem: ProblemBody;
  try {
    problem = (await res.json()) as ProblemBody;
    if (typeof problem.detail !== "string") throw new Error("not a problem body");
  } catch {
    problem = { status: res.status, code: "INTERNAL", detail: "Có lỗi xảy ra. Vui lòng thử lại." };
  }
  return new ProblemError(res.status, problem);
}

/** Browser-side JSON POST to a public endpoint (same origin, anonymous, no CSRF token). Returns status + body. */
export async function postJson<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ProblemError(0, { status: 0, code: "NETWORK", detail: "Không kết nối được máy chủ. Vui lòng thử lại." });
  }
  if (!res.ok) throw await toProblem(res);
  return { status: res.status, data: (await res.json()) as T };
}
