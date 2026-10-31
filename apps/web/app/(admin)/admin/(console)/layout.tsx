import type { ReactNode } from "react";

/** Authenticated admin area: the shell (menu, session, bell) wraps every page here (owned by the admin agent). */
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
