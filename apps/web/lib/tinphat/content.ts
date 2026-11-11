/** Fixed brand copy of Tín Phát Decor. Products and categories come from the admin, not from here. */
import type { StaticImageData } from "next/image";
import banner from "@/public/images/tinphat/banner.jpg";
import company from "@/public/images/tinphat/mo-hinh-cong-ty.jpg";

export const BRAND = {
  name: "TÍN PHÁT DECOR",
  tagline: "Decor cho mọi mùa.",
  description:
    "TÍN PHÁT DECOR chuyên sản xuất và phân phối các sản phẩm trang trí theo mùa và quanh năm, phục vụ cửa hàng, đại lý và khách hàng nhập số lượng lớn.",
};

/**
 * The build gives an imported picture a URL with a hash of its content, so a picture replaced under the same file
 * name shows at once: resized copies are cached for a month by URL, so a fixed URL would keep the old picture.
 * (Unit tests import a picture as a plain path string, hence the fallback.)
 */
const url = (image: StaticImageData | string) =>
  typeof image === "string" ? image : image.src;

export const IMAGES = {
  hero: url(banner),
  /** Aerial view of the whole factory, in the "Năng lực" section. */
  company: url(company),
};

export const HIGHLIGHTS = [
  {
    title: "Đa dạng sản phẩm",
    text: "Phủ đầy đủ các mùa lễ hội và nhu cầu trang trí quanh năm với danh mục sản phẩm phong phú.",
  },
  {
    title: "Nguồn hàng ổn định",
    text: "Nguồn cung đảm bảo, sẵn sàng đáp ứng mọi thời điểm trong năm, kể cả mùa cao điểm.",
  },
  {
    title: "Đơn hàng số lượng lớn",
    text: "Phù hợp cửa hàng, đại lý và doanh nghiệp cần nhập hàng số lượng lớn, giá tốt.",
  },
  {
    title: "Sản xuất & Phân phối",
    text: "Tham gia trực tiếp vào chuỗi cung ứng, đảm bảo chất lượng sản phẩm đến tay khách hàng.",
  },
];

export const SEASONS = [
  {
    name: "Tết Nguyên Đán",
    period: "Tháng 1 – 2",
    accent: "#D7141C",
    tint: "#FDEBEC",
    text: "Câu đối, ông thần tài và các sản phẩm trang trí truyền thống ngày Tết.",
  },
  {
    name: "Tết Trung Thu",
    period: "Tháng 8 – 9",
    accent: "#B45309",
    tint: "#FEF3C7",
    text: "Lồng đèn, đèn kéo quân và các sản phẩm trang trí Rằm Trung Thu.",
  },
  {
    name: "Giáng Sinh",
    period: "Tháng 11 – 12",
    accent: "#1A5C3A",
    tint: "#E8F4ED",
    text: "Kim tuyến, đèn Noel và các sản phẩm trang trí mùa Giáng Sinh.",
  },
  {
    name: "Sinh nhật & Party",
    period: "Quanh năm",
    accent: "#7C3AED",
    tint: "#F3F0FF",
    text: "Mũ, nến, phụ kiện trang trí bánh và banner cho mọi dịp tiệc.",
  },
];

export const CAPABILITIES = [
  {
    title: "Sản xuất",
    text: "Tham gia trực tiếp vào quá trình sản xuất một số dòng sản phẩm.",
  },
  {
    title: "Phân phối",
    text: "Hệ thống phân phối rộng, cung ứng sản phẩm đến nhiều khu vực.",
  },
  {
    title: "Nguồn hàng",
    text: "Nguồn hàng ổn định, đa dạng sản phẩm cho các mùa lễ hội.",
  },
  {
    title: "Đóng hàng",
    text: "Quy trình đóng gói chuyên nghiệp, đảm bảo hàng hóa nguyên vẹn khi đến tay khách.",
  },
  {
    title: "Đơn hàng số lượng lớn",
    text: "Đáp ứng các đơn hàng số lượng lớn cho cửa hàng, đại lý và sự kiện.",
  },
];

export const PROCESS_STEPS = [
  {
    title: "Trao đổi nhu cầu",
    text: "Khách hàng liên hệ và chia sẻ nhu cầu về sản phẩm, số lượng và thời gian cần hàng.",
  },
  {
    title: "Tư vấn sản phẩm",
    text: "Đội ngũ TÍN PHÁT DECOR tư vấn sản phẩm phù hợp, báo giá và hỗ trợ chọn mẫu.",
  },
  {
    title: "Xác nhận đơn hàng",
    text: "Khách hàng xác nhận sản phẩm, số lượng và các điều kiện giao hàng.",
  },
  {
    title: "Chuẩn bị & đóng hàng",
    text: "TÍN PHÁT DECOR chuẩn bị, kiểm tra và đóng gói hàng hóa cẩn thận trước khi xuất.",
  },
  {
    title: "Giao hàng",
    text: "Hàng hóa được giao đến địa chỉ khách hàng an toàn, đúng thời gian đã thỏa thuận.",
  },
];

/** Company location on Google Maps: Cầu chợ Trâu, Hải Hưng, Ninh Bình. */
const MAP_LAT = 20.2148128;
const MAP_LNG = 106.3205046;
export const MAP = {
  embedUrl: `https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3738.1917254143937!2d${MAP_LNG}!3d${MAP_LAT}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjDCsDEyJzUzLjMiTiAxMDbCsDE5JzEzLjgiRQ!5e0!3m2!1svi!2svn!4v1694496000000!5m2!1svi!2svn`,
  directionsUrl: "https://maps.app.goo.gl/sTq4fzmAe5UbG6Yt9",
};
