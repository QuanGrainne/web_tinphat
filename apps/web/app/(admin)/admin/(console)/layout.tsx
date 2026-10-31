import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";

/** Authenticated admin area: the shell (menu, session guard, bell) wraps every page here. */
export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
