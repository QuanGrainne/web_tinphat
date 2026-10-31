import { describe, expect, it } from "vitest";
import { savingText } from "./saving-badge";

describe("savingText", () => {
  it("shows the percentage with a decimal comma", () => {
    expect(savingText({ kind: "PERCENT", pct: 1.9 })).toBe("Tiết kiệm 1,9%");
    expect(savingText({ kind: "PERCENT", pct: 12 })).toBe("Tiết kiệm 12,0%");
  });

  it("says same-as-retail instead of 0%", () => {
    expect(savingText({ kind: "EQUAL", pct: 0 })).toBe("Bằng giá mua lẻ");
  });

  it("shows nothing when there is no saving or no number", () => {
    expect(savingText({ kind: "NONE", pct: null })).toBeNull();
    expect(savingText({ kind: "PERCENT", pct: null })).toBeNull();
  });
});
