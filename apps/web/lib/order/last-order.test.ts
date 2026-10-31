import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? (this.data.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
  clear() {
    this.data.clear();
  }
}

const fake = new MemoryStorage();
Object.defineProperty(globalThis, "sessionStorage", { value: fake, configurable: true });

const store = await import("./last-order");

describe("last-order", () => {
  beforeEach(() => fake.clear());

  it("remembers the phone per normalised order code", () => {
    store.rememberOrder("dna 7k2m-9q", " 0912 345 678 ");
    expect(store.recallPhone("DNA7K2M9Q")).toBe("0912 345 678");
    expect(store.recallPhone("DNA000000")).toBeNull();
  });

  it("keeps several orders and replaces the phone of the same code", () => {
    store.rememberOrder("DNA111111", "0911111111");
    store.rememberOrder("DNA222222", "0922222222");
    store.rememberOrder("DNA111111", "0933333333");
    expect(store.recallPhone("DNA111111")).toBe("0933333333");
    expect(store.recallPhone("DNA222222")).toBe("0922222222");
  });

  it("keeps only the five newest orders", () => {
    for (let i = 1; i <= 7; i++) store.rememberOrder(`DNA00000${i}`, `091000000${i}`);
    expect(store.recallPhone("DNA000001")).toBeNull();
    expect(store.recallPhone("DNA000002")).toBeNull();
    expect(store.recallPhone("DNA000007")).toBe("0910000007");
  });

  it("forgets a single order", () => {
    store.rememberOrder("DNA111111", "0911111111");
    store.rememberOrder("DNA222222", "0922222222");
    store.forgetOrder("DNA111111");
    expect(store.recallPhone("DNA111111")).toBeNull();
    expect(store.recallPhone("DNA222222")).toBe("0922222222");
  });

  it("ignores corrupt stored data", () => {
    fake.setItem(store.LAST_ORDER_KEY, "{not json");
    expect(store.recallPhone("DNA111111")).toBeNull();
    fake.setItem(store.LAST_ORDER_KEY, JSON.stringify({ DNA111111: "0911111111" }));
    expect(store.recallPhone("DNA111111")).toBeNull();
    store.rememberOrder("DNA111111", "0911111111");
    expect(store.recallPhone("DNA111111")).toBe("0911111111");
  });
});
