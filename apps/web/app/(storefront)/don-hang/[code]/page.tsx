import type { Metadata } from "next";
import { OrderDetail } from "@/components/storefront/order-detail";
import { PageFrame } from "@/components/storefront/static-page";

// The order is looked up in the browser with code + phone; nothing about it is rendered or cached on the server.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đơn hàng",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <PageFrame crumbs={[{ name: "Tra cứu đơn", href: "/tra-cuu-don" }]}>
      <OrderDetail key={code} code={code} />
    </PageFrame>
  );
}
