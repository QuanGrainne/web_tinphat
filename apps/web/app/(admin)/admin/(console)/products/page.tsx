import type { Metadata } from "next";
import { ProductsPage } from "@/components/admin/products/products-page";

export const metadata: Metadata = { title: "Hàng hóa" };

export default function AdminProductsRoute() {
  return <ProductsPage />;
}
