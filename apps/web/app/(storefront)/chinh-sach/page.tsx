import type { Metadata } from "next";
import { Bullets, InfoSection, PageFrame, StaticPage } from "@/components/storefront/static-page";
import { apiGet } from "@/lib/api/server-fetch";
import type { PublicSettings } from "@/lib/api/types";
import { formatPhone } from "@/lib/order/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chính sách",
  description: "Chính sách đổi trả, vận chuyển, thanh toán và bảo mật thông tin của DNA Hoàng Nguyên.",
  alternates: { canonical: "/chinh-sach" },
};

export default async function PolicyPage() {
  const { company, hotline } = await apiGet<PublicSettings>("/api/public/settings");
  // non-breaking spaces keep the number on one line inside sentences
  const phone = formatPhone(hotline || company.phone).replace(/ /g, "\u00A0");
  return (
    <PageFrame crumbs={[{ name: "Chính sách" }]}>
      <StaticPage title="Chính sách">
        <InfoSection id="doi-tra" title="Đổi trả">
          <Bullets
            items={[
              "Quý khách vui lòng kiểm tra hàng khi nhận.",
              `Hàng giao sai mã hoặc sai số lượng: liên hệ ${phone} để nhân viên hỗ trợ.`,
              `Hàng lỗi do nhà sản xuất: liên hệ ${phone}, nhân viên sẽ xem xét đổi hàng.`,
            ]}
          />
        </InfoSection>
        <InfoSection id="van-chuyen" title="Vận chuyển">
          <Bullets
            items={[
              "Nhân viên xác nhận tồn kho, phí giao và tổng tiền sau khi nhận đơn.",
              "Phí giao do nhân viên báo trên trang đơn hàng.",
              "Theo dõi đơn tại mục Tra cứu đơn bằng mã đơn và số điện thoại.",
              `Khu vực và thời gian giao hàng: liên hệ ${phone}.`,
            ]}
          />
        </InfoSection>
        <InfoSection id="thanh-toan" title="Thanh toán">
          <Bullets
            items={[
              "Giá niêm yết đã gồm VAT.",
              "Hai hình thức: thanh toán khi nhận hàng (COD) hoặc chuyển khoản.",
              "Chuyển khoản: ghi nội dung đúng mã đơn, ví dụ DNA7K2M9Q.",
              "Mã QR và số tiền cần chuyển hiển thị sau khi nhân viên xác nhận đơn.",
            ]}
          />
        </InfoSection>
        <InfoSection id="bao-mat" title="Bảo mật">
          <Bullets
            items={[
              "Chúng tôi dùng họ tên, số điện thoại, địa chỉ và email Quý khách cung cấp để xử lý báo giá và đơn hàng.",
              "Trang đơn hàng chỉ mở khi nhập đúng mã đơn và số điện thoại; địa chỉ nhận hàng không hiển thị lại.",
              "Website không yêu cầu tài khoản và không lưu thông tin thẻ thanh toán.",
            ]}
          />
        </InfoSection>
      </StaticPage>
    </PageFrame>
  );
}
