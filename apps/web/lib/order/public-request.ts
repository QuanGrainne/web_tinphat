import { ProblemError } from "@/lib/api/public-post";
import type { ProblemBody } from "@/lib/api/types";

/** 429 answer. Carries the Retry-After wait, which the shared postJson helper does not expose. */
export class RateLimitedError extends ProblemError {
  constructor(
    problem: ProblemBody,
    public readonly retryAfterSeconds: number | null,
  ) {
    super(429, problem);
    this.name = "RateLimitedError";
  }
}

/** Retry-After is either a number of seconds or an HTTP date. */
export function parseRetryAfter(value: string | null, now: number = Date.now()): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
  const at = Date.parse(value);
  return Number.isNaN(at) ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

const GENERIC_DETAIL = "Có lỗi xảy ra. Vui lòng thử lại.";

async function readProblem(res: Response): Promise<ProblemBody> {
  try {
    const body = (await res.json()) as ProblemBody;
    if (typeof body.detail === "string") return body;
  } catch {
    // not a problem+json body
  }
  return { status: res.status, code: "INTERNAL", detail: GENERIC_DETAIL };
}

/** Browser-side JSON POST to a public endpoint, like postJson but keeps Retry-After on 429. */
export async function postPublic<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
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
  if (!res.ok) {
    const problem = await readProblem(res);
    if (res.status === 429) throw new RateLimitedError(problem, parseRetryAfter(res.headers.get("Retry-After")));
    throw new ProblemError(res.status, problem);
  }
  try {
    return { status: res.status, data: (await res.json()) as T };
  } catch {
    throw new ProblemError(res.status, { status: res.status, code: "INTERNAL", detail: GENERIC_DETAIL });
  }
}
