import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import {
  AboutSection,
  CapabilitySection,
  ProcessSection,
  SeasonsSection,
} from "@/components/storefront/tinphat-sections";
import { BRAND, IMAGES } from "@/lib/tinphat/content";
import { CatalogImage } from "@/components/catalog-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: BRAND.description,
  alternates: { canonical: "/gioi-thieu" },
};

export default function AboutPage() {
  return (
    <main>
      <div className="wrap">
        <Breadcrumb
          trail={[
            { name: "Trang chủ", href: "/" },
            { name: "Giới thiệu", href: "/gioi-thieu" },
          ]}
        />
        <h1 className="sr">Giới thiệu {BRAND.name}</h1>
        <CatalogImage
          className="tp-hero-i"
          src={IMAGES.hero}
          alt="Văn phòng TÍN PHÁT DECOR"
          width={1400}
          height={788}
          priority
          sizes="(min-width: 1344px) 1320px, 100vw"
        />
      </div>
      <AboutSection />
      <SeasonsSection />
      <CapabilitySection />
      <ProcessSection />
    </main>
  );
}
