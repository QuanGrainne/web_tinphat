import type { Metadata } from "next";
import { BrandsPage } from "@/components/admin/brands/brands-page";

export const metadata: Metadata = { title: "Thương hiệu" };

export default function AdminBrandsRoute() {
  return <BrandsPage />;
}
