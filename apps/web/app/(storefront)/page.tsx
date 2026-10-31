import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JsonLdScript } from "@/components/storefront/json-ld-script";
import { ProductGrid } from "@/components/storefront/product-grid";
import { loadSettings } from "@/components/storefront/shell-data";
import { apiGet } from "@/lib/api/server-fetch";
import type { HomeData } from "@/lib/api/types";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { SITE_NAME, siteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Giấy tiêu dùng, pin và học cụ sáng tạo. Giá đã gồm VAT.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "vi_VN", siteName: SITE_NAME, title: SITE_NAME, description: DESCRIPTION, url: "/" },
};

function colsStyle(count: number, max: number): CSSProperties {
  return { "--cols": Math.max(1, Math.min(count, max)) } as CSSProperties;
}

export default async function HomePage() {
  const [home, settings] = await Promise.all([apiGet<HomeData>("/api/public/home"), loadSettings()]);
  const sections = home.sections.filter((section) => section.products.length > 0);

  return (
    <main>
      <section className="hero">
        <div className="wrap">
          <h1>Giấy tiêu dùng, pin, học cụ</h1>
          <p>Giá đã gồm VAT</p>
          <a className="btn btn-white" href="#nhom-hang">
            Xem sản phẩm
          </a>
        </div>
      </section>

      {settings && settings.trustStrip.length > 0 && (
        <div className="trust">
          <div className="wrap">
            {settings.trustStrip.map((text) => (
              <span key={text}>
                <i className={`i ${/hotline|điện thoại/i.test(text) ? "i-phone" : "i-check"}`} aria-hidden="true" />
                {text}
              </span>
            ))}
          </div>
        </div>
      )}

      {home.categories.length > 0 && (
        <section className="sec wrap" id="nhom-hang">
          <h2 className="sec-t">Nhóm hàng</h2>
          <div className="sec-b">
            <div className="tiles t6" style={colsStyle(home.categories.length, 6)}>
              {home.categories.map((category) => (
                <Link key={category.slug} className="tile" href={`/danh-muc/${category.slug}`} prefetch={false}>
                  <div className="ph">
                    <i className="i i-image" aria-hidden="true" />
                  </div>
                  <b>{category.name}</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {home.brands.length > 0 && (
        <section className="sec wrap">
          <h2 className="sec-t">Thương hiệu</h2>
          <div className="sec-b">
            <div className="tiles t5" style={colsStyle(home.brands.length, 5)}>
              {home.brands.map((brand) => (
                <Link key={brand.slug} className="tile brand" href={`/thuong-hieu/${brand.slug}`} prefetch={false}>
                  <div className="ph">
                    <i className="i i-image" aria-hidden="true" />
                  </div>
                  <b>{brand.name}</b>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {sections.map((section) => (
        <section key={section.category.slug} className="sec wrap">
          <h2 className="sec-t">{section.category.name}</h2>
          <div className="sec-b">
            <ProductGrid cards={section.products} variant="grid-5" />
          </div>
          <div className="more">
            <Link className="btn" href={`/danh-muc/${section.category.slug}`} prefetch={false}>
              Xem thêm sản phẩm
              <i className="i i-down" style={{ width: 14, height: 14 }} aria-hidden="true" />
            </Link>
          </div>
        </section>
      ))}

      {settings && <JsonLdScript data={organizationJsonLd(settings, siteUrl())} />}
    </main>
  );
}
