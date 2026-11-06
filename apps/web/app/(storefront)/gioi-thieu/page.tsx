import type { Metadata } from "next";
import { Breadcrumb } from "@/components/storefront/breadcrumb";
import { loadSettings } from "@/components/storefront/shell-data";
import { CompanyFacts, InfoSection } from "@/components/storefront/static-page";
import { AboutSection, CapabilitySection, ContactCta, ProcessSection, SeasonsSection } from "@/components/storefront/tinphat-sections";
import { BRAND, IMAGES } from "@/lib/tinphat/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: BRAND.description,
  alternates: { canonical: "/gioi-thieu" },
};

export default async function AboutPage() {
  const settings = await loadSettings();
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
        {/* eslint-disable-next-line @next/next/no-img-element -- plain img by design: no image optimiser on the small VPS */}
        <img className="tp-hero-i" src={IMAGES.hero} alt="Văn phòng TÍN PHÁT DECORD" width={1400} height={788} fetchPriority="high" decoding="async" />
      </div>
      <AboutSection />
      <SeasonsSection />
      <CapabilitySection />
      <ProcessSection />
      {settings && (
        <div className="tp-sec wrap">
          <div className="spage">
            <InfoSection title="Thông tin công ty">
              <CompanyFacts company={settings.company} hotline={settings.hotline} />
            </InfoSection>
          </div>
        </div>
      )}
      <ContactCta settings={settings} />
    </main>
  );
}
