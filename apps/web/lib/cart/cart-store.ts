"use client";

import { useSyncExternalStore } from "react";
import type { CartLineIn } from "@/lib/api/types";

/** Two independent baskets in localStorage. Only SKU ids and quantities are stored; the server reprices. */
export type BasketKind = "quote" | "order";
export interface CartState {
  v: 1;
  quote: CartLineIn[];
  order: CartLineIn[];
}

export const CART_KEY = "dna.cart";
export const MAX_QTY = 9999;
export const MAX_LINES = 50;

const EMPTY: CartState = { v: 1, quote: [], order: [] };
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: CartState } = { raw: null, state: EMPTY };
let storageListenerAttached = false;

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

function sanitizeLines(value: unknown): CartLineIn[] {
  if (!Array.isArray(value)) return [];
  const out: CartLineIn[] = [];
  for (const item of value) {
    const skuId = Number((item as CartLineIn)?.skuId);
    const qty = Number((item as CartLineIn)?.qty);
    if (!Number.isInteger(skuId) || skuId <= 0 || !Number.isInteger(qty) || qty < 1) continue;
    if (out.some((l) => l.skuId === skuId)) continue;
    out.push({ skuId, qty: Math.min(qty, MAX_QTY) });
    if (out.length >= MAX_LINES) break;
  }
  return out;
}

function parse(raw: string | null): CartState {
  if (!raw) return EMPTY;
  try {
    const data = JSON.parse(raw) as { v?: number; quote?: unknown; order?: unknown };
    if (data?.v !== 1) return EMPTY;
    return { v: 1, quote: sanitizeLines(data.quote), order: sanitizeLines(data.order) };
  } catch {
    return EMPTY;
  }
}

/** Current basket; the returned object is stable until the stored value changes (safe for useSyncExternalStore). */
export function getCart(): CartState {
  const raw = storage()?.getItem(CART_KEY) ?? null;
  if (raw !== cache.raw) cache = { raw, state: parse(raw) };
  return cache.state;
}

function write(next: CartState): void {
  const raw = JSON.stringify(next);
  storage()?.setItem(CART_KEY, raw);
  cache = { raw, state: next };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== "undefined" && window.addEventListener) {
    storageListenerAttached = true;
    window.addEventListener("storage", (e) => {
      if (e.key === CART_KEY || e.key === null) listeners.forEach((l) => l());
    });
  }
  return () => listeners.delete(listener);
}

/** Add a SKU (merges with an existing line, caps quantity and line count). */
export function addLine(kind: BasketKind, skuId: number, qty: number): void {
  const state = getCart();
  const lines = state[kind].map((l) => ({ ...l }));
  const safeQty = Math.min(Math.max(Math.trunc(qty) || 1, 1), MAX_QTY);
  const existing = lines.find((l) => l.skuId === skuId);
  if (existing) existing.qty = Math.min(existing.qty + safeQty, MAX_QTY);
  else if (lines.length < MAX_LINES) lines.push({ skuId, qty: safeQty });
  write({ ...state, [kind]: lines });
}

export function setQty(kind: BasketKind, skuId: number, qty: number): void {
  const state = getCart();
  const safeQty = Math.min(Math.max(Math.trunc(qty) || 1, 1), MAX_QTY);
  write({ ...state, [kind]: state[kind].map((l) => (l.skuId === skuId ? { ...l, qty: safeQty } : l)) });
}

export function removeLine(kind: BasketKind, skuId: number): void {
  const state = getCart();
  write({ ...state, [kind]: state[kind].filter((l) => l.skuId !== skuId) });
}

export function clearBasket(kind: BasketKind): void {
  write({ ...getCart(), [kind]: [] });
}

/** Number of lines (not quantity) in a basket: the header counter. */
export function countLines(state: CartState, kind: BasketKind): number {
  return state[kind].length;
}

/** React hook: the basket, empty on the server and during hydration. */
export function useCart(): CartState {
  return useSyncExternalStore(subscribe, getCart, () => EMPTY);
}
