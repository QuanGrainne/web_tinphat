import type { Metadata } from "next";
import { CompanyFacts, InfoSection, PageFrame, StaticPage } from "@/components/storefront/static-page";
import { apiGet } from "@/lib/api/server-fetch";
import type { PublicSettings } from "@/lib/api/types";
import { formatPhone, telHref, zaloHref } from "@/lib/order/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Liên hệ",
  description: "Địa chỉ, kho, số điện thoại và email của DNA Hoàng Nguyên.",
  alternates: { canonical: "/lien-he" },
};

export default async function ContactPage() {
  const { company, hotline, zalo } = await apiGet<PublicSettings>("/api/public/settings");
  const phone = hotline || company.phone;
  const zaloLink = zaloHref(zalo);
  return (
    <PageFrame crumbs={[{ name: "Liên hệ" }]}>
      <StaticPage title="Liên hệ">
        <InfoSection title="Thông tin liên hệ">
          <CompanyFacts company={company} hotline={hotline} />
          <div className="pg-acts">
            <a className="btn btn-pri btn-lg" href={telHref(phone)}>
              <i className="i i-phone" aria-hidden="true" />
              Gọi {formatPhone(phone)}
            </a>
            {zaloLink ? (
              <a className="btn btn-out btn-lg" href={zaloLink} target="_blank" rel="noopener noreferrer">
                <i className="i i-chat" aria-hidden="true" />
                Nhắn Zalo
              </a>
            ) : null}
          </div>
        </InfoSection>
      </StaticPage>
    </PageFrame>
  );
}
