import type { Metadata } from "next";
import { CheckoutForm } from "@/components/storefront/checkout-form";
import { PageFrame } from "@/components/storefront/static-page";

export const metadata: Metadata = {
  title: "Giỏ hàng",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <PageFrame crumbs={[{ name: "Giỏ hàng" }]}>
      <CheckoutForm />
    </PageFrame>
  );
}
