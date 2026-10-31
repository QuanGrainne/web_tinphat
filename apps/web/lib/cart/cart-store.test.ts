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
Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true });

const store = await import("./cart-store");

describe("cart-store", () => {
  beforeEach(() => {
    fake.clear();
    store.clearBasket("quote");
    store.clearBasket("order");
  });

  it("merges the same SKU and keeps the two baskets independent", () => {
    store.addLine("quote", 7, 2);
    store.addLine("quote", 7, 3);
    store.addLine("order", 7, 1);
    const state = store.getCart();
    expect(state.quote).toEqual([{ skuId: 7, qty: 5 }]);
    expect(state.order).toEqual([{ skuId: 7, qty: 1 }]);
  });

  it("caps quantity at 9999 and lines at 50", () => {
    store.addLine("order", 1, 9000);
    store.addLine("order", 1, 9000);
    expect(store.getCart().order[0].qty).toBe(store.MAX_QTY);
    for (let i = 2; i < 80; i++) store.addLine("order", i, 1);
    expect(store.getCart().order.length).toBe(store.MAX_LINES);
  });

  it("resets on corrupt JSON or an unknown version", () => {
    fake.setItem(store.CART_KEY, "{not json");
    expect(store.getCart().quote).toEqual([]);
    fake.setItem(store.CART_KEY, JSON.stringify({ v: 2, quote: [{ skuId: 1, qty: 1 }], order: [] }));
    expect(store.getCart().quote).toEqual([]);
  });

  it("returns a stable snapshot until the stored value changes", () => {
    store.addLine("quote", 3, 1);
    expect(store.getCart()).toBe(store.getCart());
  });
});
