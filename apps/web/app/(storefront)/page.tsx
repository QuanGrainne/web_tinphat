import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueSidebar } from "@/components/storefront/catalogue-sidebar";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { ProductGrid } from "@/components/storefront/product-grid";
import {
  contactHref,
  loadNav,
  loadSettings,
} from "@/components/storefront/shell-data";
import {
  AboutSection,
  CapabilitySection,
  CategoryTiles,
  ProcessSection,
  SeasonsSection,
} from "@/components/storefront/tinphat-sections";
import { apiGet } from "@/lib/api/server-fetch";
import type { HomeData } from "@/lib/api/types";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME, siteUrl } from "@/lib/seo/metadata";
import { BRAND, HIGHLIGHTS, IMAGES } from "@/lib/tinphat/content";
import { CatalogImage } from "@/components/catalog-image";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: BRAND.description,
    url: "/",
  },
};

/** Banner, category tiles, one product row per category beside the side list, then the company sections. */
export default async function HomePage() {
  const [home, nav, settings] = await Promise.all([
    apiGet<HomeData>("/api/public/home"),
    loadNav(),
    loadSettings(),
  ]);
  const sections = home.sections.filter(
    (section) => section.products.length > 0,
  );
  const contact = contactHref(settings);
  const featured = sections.map((section) => section.products[0]).slice(0, 5);

  return (
    <main>
      <section className="tp-banner">
        <CatalogImage src={IMAGES.hero} fill priority sizes="100vw" />
        <div className="wrap">
          <span>Sản xuất &amp; Phân phối</span>
          <h1>
            Decor <em>cho mọi</em> mùa.
          </h1>
          <p>
            Sản phẩm trang trí theo mùa và quanh năm cho cửa hàng, đại lý và
            khách nhập số lượng lớn.
          </p>
          <div className="tp-acts">
            <Link className="btn btn-pri btn-lg" href="/san-pham">
              Xem tất cả sản phẩm
            </Link>
            <Link className="btn btn-lg tp-ghost" href="/lien-he">
              Liên hệ hợp tác
            </Link>
          </div>
        </div>
      </section>

      <div className="wrap">
        <ul className="tp-trust">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <i className="i i-check" aria-hidden="true" />
              {item.title}
            </li>
          ))}
        </ul>

        {home.categories.length > 0 && (
          <section className="tp-block">
            <h2 className="tp-block-t">Danh mục sản phẩm</h2>
            <CategoryTiles categories={home.categories} />
          </section>
        )}

        <div className="tp-shop tp-home">
          <CatalogueSidebar nav={nav} settings={settings} featured={featured} />
          <div>
            {sections.map((section) => {
              const info = home.categories.find(
                (category) => category.slug === section.category.slug,
              );
              const href = `/danh-muc/${section.category.slug}`;
              return (
                <section key={section.category.slug} className="tp-rowsec">
                  <h2 className="tp-block-t">
                    <Link href={href} prefetch={false}>
                      {section.category.name}
                    </Link>
                  </h2>
                  {info?.imageUrl && (
                    <Link className="tp-catband" href={href} prefetch={false}>
                      <CatalogImage
                        src={info.imageUrl}
                        fill
                        sizes="(min-width: 960px) 900px, 100vw"
                      />
                      {info.description && <span>{info.description}</span>}
                    </Link>
                  )}
                  <ProductGrid
                    cards={section.products}
                    variant="grid-4"
                    contactHref={contact}
                  />
                  <div className="more">
                    <Link className="btn" href={href} prefetch={false}>
                      Xem thêm sản phẩm
                    </Link>
                  </div>
                </section>
              );
            })}
            {sections.length === 0 && (
              <div className="empty">
                <b>Chưa có sản phẩm</b>
                <p>Sản phẩm sẽ sớm được cập nhật.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SeasonsSection />
      <AboutSection />
      <CapabilitySection />
      <ProcessSection />

      {settings && (
        <JsonLdScript data={organizationJsonLd(settings, siteUrl())} />
      )}
    </main>
  );
}
