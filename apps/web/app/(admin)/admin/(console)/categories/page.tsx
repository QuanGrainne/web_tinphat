import type { Metadata } from "next";
import { CategoriesPage } from "@/components/admin/categories/categories-page";

export const metadata: Metadata = { title: "Nhóm hàng" };

export default function AdminCategoriesRoute() {
  return <CategoriesPage />;
}
