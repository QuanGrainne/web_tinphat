"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLineIn, PricedCart } from "@/lib/api/types";
import { useCart, type BasketKind } from "@/lib/cart/cart-store";
import { describeProblem, type ProblemView } from "./problem-view";
import { postPublic } from "./public-request";
import { useHydrated } from "./use-hydrated";

const linesKey = (lines: CartLineIn[]) => lines.map((l) => `${l.skuId}x${l.qty}`).join(",");

/**
 * A basket (quote or order) priced by the API. Quantities live in the local basket; prices always come from
 * POST /api/public/cart/price. `synced` is true when the priced answer matches the lines currently in the basket.
 */
export function usePricedBasket(kind: BasketKind) {
  const hydrated = useHydrated();
  const lines = useCart()[kind];
  const key = linesKey(lines);
  const [snapshot, setSnapshot] = useState<{ key: string; cart: PricedCart } | null>(null);
  const [failure, setFailure] = useState<{ key: string; view: ProblemView } | null>(null);
  const [reload, setReload] = useState(0);
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let stale = false;
    // The first answer is immediate; later quantity edits are batched.
    const timer = setTimeout(
      () => {
        postPublic<PricedCart>("/api/public/cart/price", { lines })
          .then(({ data }) => {
            if (stale) return;
            loadedOnce.current = true;
            setSnapshot({ key, cart: data });
            setFailure(null);
          })
          .catch((e: unknown) => {
            if (!stale) setFailure({ key, view: describeProblem(e) });
          });
      },
      loadedOnce.current ? 250 : 0,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [hydrated, key, lines, reload]);

  const hasLines = lines.length > 0;
  const synced = hasLines && snapshot?.key === key;
  const error = hasLines && failure?.key === key ? failure.view : null;
  const applyPriced = useCallback((cart: PricedCart) => setSnapshot({ key, cart }), [key]);
  const refresh = useCallback(() => {
    setFailure(null);
    setReload((n) => n + 1);
  }, []);

  return {
    hydrated,
    lines,
    priced: hasLines ? (snapshot?.cart ?? null) : null,
    synced,
    loading: hasLines && !synced && !error,
    error,
    applyPriced,
    refresh,
  };
}
