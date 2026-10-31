import { describe, expect, it } from "vitest";
import { formatNumber, formatPct, formatVnd } from "./money";

describe("money formatting", () => {
  it("groups thousands with dots", () => {
    expect(formatNumber(428500)).toBe("428.500");
    expect(formatNumber(1152680)).toBe("1.152.680");
    expect(formatNumber(999)).toBe("999");
  });

  it("adds the dong suffix", () => {
    expect(formatVnd(428500)).toBe("428.500đ");
    expect(formatVnd(0)).toBe("0đ");
  });

  it("uses a decimal comma for percent", () => {
    expect(formatPct(1.9)).toBe("1,9%");
    expect(formatPct(0.6)).toBe("0,6%");
  });
});
