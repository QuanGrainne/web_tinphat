import { describe, expect, it } from "vitest";
import { formatDateTimeVn } from "./format-time";

describe("formatDateTimeVn", () => {
  it("shows Vietnam time whatever the offset in the string", () => {
    expect(formatDateTimeVn("2026-10-29T17:40:00+07:00")).toBe("17:40 29/10/2026");
    expect(formatDateTimeVn("2026-10-29T10:40:00Z")).toBe("17:40 29/10/2026");
    expect(formatDateTimeVn("2026-12-31T20:05:00Z")).toBe("03:05 01/01/2027");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDateTimeVn("not a date")).toBe("");
  });
});
