import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

const fake = new MemoryStorage();
const setStorage = (value: unknown) => Object.defineProperty(globalThis, "sessionStorage", { value, configurable: true });
setStorage(fake);

const ids = await import("./submission-id");
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("submission id", () => {
  beforeEach(() => {
    setStorage(fake);
    fake.clear();
    ids.resetSubmissionId("quote");
    ids.resetSubmissionId("order");
  });

  it("is a v4 UUID that stays the same across retries", () => {
    const first = ids.getSubmissionId("order");
    expect(first).toMatch(UUID_V4);
    expect(ids.getSubmissionId("order")).toBe(first);
    expect(ids.getSubmissionId("order")).toBe(first);
  });

  it("keeps quote and order ids apart", () => {
    expect(ids.getSubmissionId("quote")).not.toBe(ids.getSubmissionId("order"));
  });

  it("changes after a success resets it", () => {
    const first = ids.getSubmissionId("quote");
    ids.resetSubmissionId("quote");
    const second = ids.getSubmissionId("quote");
    expect(second).toMatch(UUID_V4);
    expect(second).not.toBe(first);
  });

  it("survives a page reload because it lives in sessionStorage", () => {
    const first = ids.getSubmissionId("order");
    expect(fake.getItem("dna.submission.order")).toBe(first);
  });

  it("replaces a corrupt stored value", () => {
    fake.setItem("dna.submission.order", "not-a-uuid");
    expect(ids.getSubmissionId("order")).toMatch(UUID_V4);
  });

  it("still holds for the page view when sessionStorage is unavailable", () => {
    setStorage(undefined);
    const first = ids.getSubmissionId("order");
    expect(first).toMatch(UUID_V4);
    expect(ids.getSubmissionId("order")).toBe(first);
    ids.resetSubmissionId("order");
    expect(ids.getSubmissionId("order")).not.toBe(first);
  });

  it("builds a valid v4 UUID from getRandomValues when randomUUID is missing", () => {
    const source = {
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        (array as unknown as Uint8Array).fill(0xff);
        return array;
      },
    };
    expect(ids.uuidV4(source)).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff");
    expect(ids.uuidV4(source)).toMatch(UUID_V4);
  });
});
