"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** false while rendering on the server and during hydration, true afterwards (browser-only data is safe to read). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
