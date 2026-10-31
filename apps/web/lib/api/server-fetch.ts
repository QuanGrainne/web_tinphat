import { notFound } from "next/navigation";

const API_BASE = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8080";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Build a query string, skipping empty values; arrays become repeated keys. */
export function qs(params: Record<string, string | number | boolean | (string | number)[] | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value)) value.forEach((v) => sp.append(key, String(v)));
    else sp.append(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/**
 * Server-side GET against the Spring API (internal network). 404 -> notFound().
 * Any other failure THROWS so an error is never rendered (or cached) as an empty list.
 * Pages that call this must render per request (`export const dynamic = "force-dynamic"`),
 * so `next build` never needs the API.
 */
export async function apiGet<T>(path: string, options: { revalidate?: number } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: options.revalidate ?? 60 },
    });
  } catch {
    throw new ApiError(0, `API unreachable: ${path}`);
  }
  if (res.status === 404) notFound();
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}: ${path}`);
  return (await res.json()) as T;
}
