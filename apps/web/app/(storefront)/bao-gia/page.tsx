import type { Metadata } from "next";
import { QuoteForm } from "@/components/storefront/quote-form";
import { PageFrame } from "@/components/storefront/static-page";

export const metadata: Metadata = {
  title: "Báo giá",
  robots: { index: false, follow: true },
};

export default function QuotePage() {
  return (
    <PageFrame crumbs={[{ name: "Báo giá" }]}>
      <QuoteForm />
    </PageFrame>
  );
}
