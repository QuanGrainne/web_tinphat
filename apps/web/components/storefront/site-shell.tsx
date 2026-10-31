import type { ReactNode } from "react";

/** Header, nav, footer and mobile dock wrap the page content here (owned by the storefront agent). */
export function SiteShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
