import { afterEach, describe, expect, it, vi } from "vitest";
import type { Nav } from "@/lib/api/types";

vi.mock("@/lib/api/server-fetch", () => ({ apiGet: vi.fn() }));

const { apiGet } = await import("@/lib/api/server-fetch");
const { loadNav, loadSettings, telHref } = await import("./shell-data");

afterEach(() => {
  vi.mocked(apiGet).mockReset();
  vi.restoreAllMocks();
});

describe("shell data", () => {
  it("returns the api data when the call succeeds", async () => {
    const nav: Nav = { categories: [], brands: [] };
    vi.mocked(apiGet).mockResolvedValue(nav);
    await expect(loadNav()).resolves.toBe(nav);
    expect(apiGet).toHaveBeenCalledWith("/api/public/nav");
  });

  it("degrades to null and logs when the api fails, instead of throwing through the layout", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(apiGet).mockRejectedValue(new Error("API unreachable"));
    await expect(loadSettings()).resolves.toBeNull();
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("telHref", () => {
  it("keeps digits and a leading plus only", () => {
    expect(telHref("0366 985 679")).toBe("tel:0366985679");
    expect(telHref("+84 366-985-679")).toBe("tel:+84366985679");
  });
});
