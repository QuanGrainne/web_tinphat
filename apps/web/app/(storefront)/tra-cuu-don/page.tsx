import type { Metadata } from "next";
import { LookupForm } from "@/components/storefront/lookup-form";
import { PageFrame } from "@/components/storefront/static-page";

export const metadata: Metadata = {
  title: "Tra cứu đơn",
  robots: { index: false, follow: true },
  referrer: "no-referrer",
};

export default function OrderLookupPage() {
  return (
    <PageFrame crumbs={[{ name: "Tra cứu đơn" }]}>
      <div className="stack" style={{ maxWidth: 480 }}>
        <h1 style={{ font: "700 20px/1.2 Inter" }}>Tra cứu đơn</h1>
        <LookupForm />
      </div>
    </PageFrame>
  );
}
