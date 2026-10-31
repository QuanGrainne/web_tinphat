import type { Metadata } from "next";
import { Bullets, CompanyFacts, InfoSection, PageFrame, StaticPage } from "@/components/storefront/static-page";
import { apiGet } from "@/lib/api/server-fetch";
import type { PublicSettings } from "@/lib/api/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giới thiệu",
  description: "Thông tin công ty DNA Hoàng Nguyên: giấy tiêu dùng, pin và học cụ sáng tạo, giá đã gồm VAT.",
  alternates: { canonical: "/gioi-thieu" },
};

export default async function AboutPage() {
  const { company, hotline } = await apiGet<PublicSettings>("/api/public/settings");
  return (
    <PageFrame crumbs={[{ name: "Giới thiệu" }]}>
      <StaticPage title="Giới thiệu">
        <p>
          {company.name} cung cấp giấy tiêu dùng, pin và học cụ sáng tạo. Quý khách có thể xem giá, gửi yêu cầu báo giá hoặc đặt hàng
          ngay trên website.
        </p>
        <InfoSection title="Mua hàng">
          <Bullets
            items={[
              "Giá niêm yết đã gồm VAT.",
              "Cần báo giá số lượng lớn: gửi yêu cầu báo giá, nhân viên sẽ liên hệ.",
              "Đặt hàng không cần tạo tài khoản; thanh toán khi nhận hàng (COD) hoặc chuyển khoản.",
              "Nhân viên xác nhận tồn kho, phí giao và tổng tiền sau khi nhận đơn.",
            ]}
          />
        </InfoSection>
        <InfoSection title="Thông tin công ty">
          <CompanyFacts company={company} hotline={hotline} />
        </InfoSection>
      </StaticPage>
    </PageFrame>
  );
}
