import type { Metadata } from "next";
import { PageFrame } from "@/components/storefront/static-page";
import { BRAND } from "@/lib/tinphat/content";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: `Địa chỉ, số điện thoại, Zalo, email và bản đồ đường đi tới ${BRAND.name}.`,
  alternates: { canonical: "/lien-he" },
};

/** The contact details, cards and map are the band every storefront page ends with (see SiteShell). */
export default function ContactPage() {
  return (
    <PageFrame crumbs={[{ name: "Liên hệ" }]}>
      <h1 className="sr">Liên hệ {BRAND.name}</h1>
    </PageFrame>
  );
}
