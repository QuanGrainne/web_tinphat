# Phân tích pinhongngoc.com và thiết kế hệ thống quản trị cho DNA Hoàng Nguyên

Ngày: 29/10/2026 | Phạm vi: trang chủ + 1 trang mẫu của mỗi loại template (hãng, bảng giá sỉ, báo giá, sản phẩm, chính sách đại lý, hướng dẫn, tin tức, phân loại), desktop 1440px và mobile 390px. Đã trích 224 link nội bộ từ trang chủ để phân loại; **không mở từng link một**, vì các link cùng loại dùng chung template.

---

## 1. Công nghệ của pinhongngoc.com

| Lớp | Phát hiện | Bằng chứng |
|---|---|---|
| Nền tảng | **Sapo Web (Bizweb)**, SaaS bán hàng của Sapo | CDN `bizweb.dktcdn.net/100/510/193/themes/1142743/`, cookie `_sapo_t`, header CSP cho `*.sapo.vn`, script `/dist/js/stats.min.js` |
| Server/CDN | nginx, cache CDN (`X-Cache: hit`), HTTPS + HSTS | response headers |
| Front-end | jQuery, Bootstrap 4.3 (CSS), Swiper (carousel), lazy-load riêng, typewriter placeholder cho ô tìm kiếm | `jquery.js`, `swiper.js`, `lazy.js`, `placeholdertypewriter.js` |
| App Sapo | Sapo Loyalty, Sapo Product Reviews, appbulk-product-statistics | `loyalty.sapocorp.net`, `sapo-product-reviews-badge` |
| Tracking | Google Tag Manager (một loader duy nhất), GA, Google Ads (AW-16481676878) | đầu `<head>` |
| SEO | JSON-LD: Organization, LocalBusiness, WebSite, BreadcrumbList; canonical, robots, og tags | `<head>` |
| Code tuỳ biến | Tiền tố `phn-` (Pin Hồng Ngọc): giỏ **Báo giá** riêng, thanh dock mobile, khối khuyến mãi gộp (`phn-promo-unified`), tối ưu preconnect | class `phn-*`, `quote-count-mobile` |

**Kết luận:** đây là cửa hàng Sapo + theme tuỳ biến bằng HTML/JS, không phải hệ thống tự xây. Ưu điểm: rẻ, nhanh, có sẵn giỏ hàng/thanh toán/đơn hàng/vận chuyển. Giới hạn: mọi thứ ngoài mô hình "sản phẩm – biến thể – bộ sưu tập – trang – blog" của Sapo đều phải viết tay vào trang (xem bảng giá sỉ bên dưới).

## 2. Cấu trúc thông tin (224 link)

Tất cả URL nằm ngang hàng ở gốc (`/pin-...`), Sapo không cho phân tầng đường dẫn. Phân loại:

| Nhóm | Ví dụ | Vai trò |
|---|---|---|
| Hãng | `/pin-panasonic`, `/pin-energizer`, `/pin-gp`, `/pin-con-tho` (~15 hãng) | Bộ sưu tập cấp 1 |
| Hãng × cỡ pin | `/pin-aa-energizer`, `/pin-9v-gp`, `/pin-dai-d-maxell` | Bộ sưu tập cấp 2 (menu mega) |
| Cỡ pin (xuyên hãng) | `/pin-aa-1-5v`, `/pin-aaa-1-5v`, `/pin-12v` | Trục phân loại thứ hai |
| Phân loại | `/phan-loai-pin`, `/collections/all`, `/flash-sale` | Trang tổng hợp |
| **Bảng giá sỉ theo hãng** | `/bang-gia-si-pin-panasonic-moi-nhat` (8 hãng) | Trang SEO + chốt báo giá |
| Báo giá | `/bao-gia` | Giỏ báo giá + form lead |
| Landing theo ngành | `/pin-cho-cua-hang-tap-hoa-sieu-thi-mini`, `/pin-cho-phong-kham-nha-khoa-spa`, `/nha-cung-cap-pin-cho-van-phong-cong-ty` | SEO theo đối tượng mua |
| Nội dung | `/huong-dan-chon-pin`, `/tin-tuc`, `/khuyen-mai`, `/mua-pin-o-dau` | Blog chia 4 chuyên mục (Tin tức tổng hợp, Hướng dẫn chọn pin, Khuyến mại, Tuyển dụng) |
| Chính sách | đại lý, bảo hành, vận chuyển, bảo mật, thanh toán | Niềm tin + B2B |
| Sản phẩm | ~120 slug phẳng | Chi tiết |

Điểm hay: **một sản phẩm xuất hiện trong cả trục "hãng" lẫn trục "cỡ pin"**, bộ lọc "Loại Pin" (AA, AAA, C, D, 9V, CR2032…) nằm trong từng trang hãng.

## 3. Bố cục desktop

**Header 3 tầng:** (1) thanh đen: Đăng ký / Đăng nhập / Hotline; (2) logo, nút DANH MỤC (mega menu), ô tìm kiếm, **Báo giá**, **Kiểm tra đơn**, Giỏ hàng; (3) menu: Trang chủ, Giới thiệu, Sản phẩm, **Bảng giá sỉ**, Tin tức, Liên hệ + nút đỏ nổi bật **"Đại lý & Mua sỉ"**.

**Trang chủ (thứ tự):** hero slider → lưới 6 hãng → Deal countdown (đồng hồ đếm ngược + thanh tiến độ "Ưu đãi đang diễn ra") → từng hãng một hàng 5 sản phẩm + "Xem thêm sản phẩm" (Panasonic, Energizer, Maxell, Duracell, Con Thỏ, GP) → tin/khuyến mãi → feedback khách hàng → carousel thương hiệu nổi bật → dải chính sách (miễn phí giao từ 1 triệu) → footer 5 cột (Chính sách, Hướng dẫn, **Mua sỉ & doanh nghiệp**, Hỗ trợ).

**Trang hãng/danh mục:** breadcrumb → banner hãng → sidebar trái (bộ lọc "Loại Pin" dạng checkbox + cây danh mục có dấu +) → thanh sắp xếp (A-Z, Z-A, mới, giá) → lưới 4 cột. Nhãn Sale đỏ, giá gạch ngang, nút vàng.

**Trang bảng giá sỉ:** dạng bài viết dài chuẩn SEO: tóm tắt nhanh → khung CTA đỏ (Xem danh mục / Xem bảng giá sỉ / Chính sách đại lý, hotline-Zalo) → **bảng giá 3 bậc số lượng** → ghi chú giá → gợi ý nhập mã theo mô hình bán hàng → chính sách VAT, CO/CQ → FAQ.

**Trang sản phẩm:** gallery + thumbnail, mã SP (PVN913), tình trạng, sao đánh giá, giá + "Tiết kiệm", "Giá đã gồm VAT 8%", **khung khuyến mãi bậc giá theo giá trị đơn** (giảm 5% từ 500k, 10% từ 1 triệu, 20% từ 5 triệu), khối **"Mua sỉ & doanh nghiệp → Yêu cầu báo giá"**, "Tư vấn chọn pin" (FAQ), cam kết, tab mô tả / hướng dẫn mua / đổi trả / đánh giá.

## 4. Mobile so với desktop

Cùng một HTML, khác nhau bằng CSS responsive (không có site `m.` riêng). Riêng slider có **ảnh riêng cho mobile** (`slider_mb_2.jpg`).

| | Desktop | Mobile |
|---|---|---|
| Header | 3 tầng, menu ngang, mega menu | Logo + giỏ hàng, ô tìm kiếm full-width xuống dòng dưới; menu thu vào nút Danh mục |
| Điều hướng chính | Thanh menu trên | **Dock cố định đáy 4 nút:** Danh mục · Trang chủ · Theo dõi đơn · **Báo giá** |
| Lưới sản phẩm | 4–5 cột, sidebar lọc | 2 cột; lọc + sắp xếp thành 2 nút ("Lọc sản phẩm", "Sắp xếp") mở drawer |
| Hãng ở trang chủ | 6 cột một hàng | 3 cột, vuốt ngang |
| Trang sản phẩm | CTA nằm trong cột thông tin | **Thanh CTA dính đáy:** "Thêm vào giỏ" + "Mua ngay" (và stepper số lượng) |
| Liên hệ | Bong bóng chat nổi | Bong bóng chat nổi (đè lên nội dung, nhược điểm) |
| Tiêu đề trang | H1 vừa phải | H1 rất lớn, đẩy nội dung xuống |

Nhận xét: nút **Báo giá** được đặt ngang hàng Giỏ hàng cả desktop lẫn mobile, cho thấy họ coi **báo giá (lead) quan trọng ngang đặt hàng**. Đó là mô hình đúng cho B2B của bạn.

## 5. Điểm yếu cần tránh

1. **Bảng giá sỉ viết tay vào trang** (2 bảng HTML trong bài viết): đổi giá phải sửa tay từng trang, dễ lệch với giá sản phẩm. Bảng ghi LR6T vỉ 2 viên 26.240đ (bậc 20–100 vỉ), trong khi trang sản phẩm thùng 96 viên (48 vỉ) bán 1.206.000đ, tức khoảng 25.100đ/vỉ. Hai con số khác nhau và không có dấu hiệu cùng đọc từ một nguồn (suy luận từ markup, chưa xem phần quản trị của Sapo).
2. Bậc giá nằm ở **hai nơi khác nhau, hai logic khác nhau**: bậc theo *số vỉ* (bảng) và theo *giá trị đơn* (chính sách, khuyến mãi). Khách khó hiểu.
3. Không có quản lý đơn vị Gói/Dây/Thùng thật: tên sản phẩm chứa luôn quy cách ("Thùng 96 viên"), mỗi quy cách là một sản phẩm riêng, trùng lặp mô tả.
4. Slug phẳng, nhiều sản phẩm trùng ý (`pin-aa-con-tho`, `pin-con-tho-aa`, `pin-aa-1-5v`…) → nguy cơ trùng nội dung SEO.
5. Ảnh/feedback/carousel thương hiệu hiện trống khi chụp (có thể do lazy-load lúc chụp, chưa xác minh).

---

## 6. Thiết kế hệ thống quản trị cho DNA Hoàng Nguyên

### 6.1 Điều catalogue của bạn đòi hỏi (khác Pin Hồng Ngọc)

Catalogue: **6 nhóm hàng, 32 dòng sản phẩm, 69 mã quy cách**, giá đã gồm VAT, áp dụng từ 26/10/2026.

| # | Nhóm hàng | Dòng |
|---|---|---|
| 01 | Giấy ăn & giấy vệ sinh | 12 |
| 02 | Khăn ướt & khăn lau | 4 |
| 03 | Pin than kẽm | 10 |
| 04 | Pin kiềm Alkaline | 2 |
| 05 | Pin Lithium | 3 |
| 06 | Đồ dùng sáng tạo | 1 |

Ba đặc thù quyết định thiết kế:

- **Một dòng sản phẩm có nhiều đơn vị bán, mỗi đơn vị một mã SKU và một giá riêng.** Ví dụ Giấy ăn rút Gấu trúc: Gói 8.570đ → Dây 5 gói 42.850đ → Thùng 50 gói 428.500đ. Giá **không** luôn bằng đơn giá × số lượng (Giấy vệ sinh Sen Vàng 6 cuộn: gói 31.000đ nhưng cây 12 gói 364.750đ thay vì 372.000đ), nên phải lưu giá riêng từng SKU, không tính tự động.
- **Có ghi chú "cần xác nhận quy cách"** (SV465: 8 gói/dây hay 10 gói/dây; kích thước 175×120 chưa rõ đơn vị). Hệ thống cần cờ dữ liệu chưa chắc chắn.
- **Giá có hiệu lực theo ngày** ("áp dụng từ 26/10/2026, mọi thay đổi sẽ thông báo sau"): cần phiên bản bảng giá.

### 6.2 Cách chia danh mục để bán

Ba trục độc lập, mỗi trục là dữ liệu chứ không phải trang viết tay:

1. **Nhóm hàng (cây danh mục, 2 cấp)**: cấp 1 = 6 nhóm trong catalogue; cấp 2 = dòng/loại (ví dụ Pin than kẽm → AA, AAA, C, D, 9V).
2. **Thương hiệu**: Sen Vàng, Phong Lan, GP, Con Thỏ, DNA… Mỗi hãng có trang riêng (banner, mô tả, bộ lọc), tự sinh từ dữ liệu.
3. **Thuộc tính lọc**: cỡ pin, điện áp, số lớp, số tờ, số cuộn, loại giấy, có/không hương. Mỗi nhóm hàng khai báo bộ thuộc tính riêng (giấy có "số lớp", pin có "cỡ").

Cộng thêm **bộ sưu tập động** (quy tắc tự lọc, không gán tay): "Bán chạy", "Mới cập nhật giá", "Cho nhà hàng/khách sạn", "Cho văn phòng". Đây là cách Pin Hồng Ngọc làm các landing theo ngành, nhưng tự động.

### 6.3 Mô hình dữ liệu

```
brand(id, name, slug, logo, banner, description)
category(id, parent_id, name, slug, attribute_set_id, sort)
attribute(id, name, type)                    -- cỡ pin, số lớp, số tờ...
product            -- 32 dòng
  (id, name, slug, brand_id, category_id, description, images, attributes{}, status, seo{})
sku                -- 69 mã quy cách
  (id, product_id, code, unit[Gói|Dây|Cây|Hộp|Vỉ|Thùng], base_qty, parent_unit, needs_confirm, note)
price_list         -- phiên bản bảng giá
  (id, name, effective_from, vat_included, status[draft|scheduled|live|archived])
price_list_item(price_list_id, sku_id, price)
customer_group(id, name)                      -- Khách lẻ / Đại lý / Doanh nghiệp
price_rule         -- bậc giá
  (price_list_id, customer_group_id, scope[sku|product|order], min_qty|min_order_value, price|discount_pct)
quote_request(id, customer, phone, company, tax_code, items[sku,qty], note, status, assigned_to)
post(id, category[Tin tức|Hướng dẫn|Khuyến mãi|Tuyển dụng], title, slug, body, cover, related_product_ids, seo)
page(id, slug, blocks[])                      -- landing page ghép khối
home_section(id, type, config, sort, active)  -- cấu hình trang chủ
redirect(from, to)
```

Điểm then chốt: `sku.base_qty` (số đơn vị cơ bản trong một đơn vị bán, đúng "chỉ số quy đổi" trong catalogue) cho phép hiển thị "= 50 gói", tính đơn giá/gói để so sánh, và gộp tồn kho về đơn vị cơ bản.

### 6.4 Bảng giá sỉ không còn tĩnh

Thay bảng viết tay bằng **một khối `PriceTable` tự render từ dữ liệu**:

- Chọn nguồn: một hãng, một nhóm hàng, hoặc một bộ sưu tập.
- Cột lấy từ SKU: Mã, Quy cách, ĐVT, Giá (bảng giá đang `live` cho nhóm khách đang xem).
- Cột bậc số lượng lấy từ `price_rule`, nếu không có thì ẩn.
- Có tìm kiếm, lọc theo nhóm, ô nhập số lượng + nút **Thêm vào báo giá**, **Tải Excel/PDF** (sinh từ cùng dữ liệu, thay cho catalogue PDF gửi tay).
- Đổi giá = import bảng giá mới, đặt `effective_from`, mọi trang cập nhật cùng lúc. Bảng giá cũ lưu lại để đối soát đơn cũ.

**Quyền xem giá (chọn theo chiến lược của bạn):** (a) công khai toàn bộ như catalogue; (b) công khai giá lẻ, giá sỉ sau khi đăng ký và được duyệt; (c) "Liên hệ" ở bậc cao như Pin Hồng Ngọc. Cơ chế `customer_group` hỗ trợ cả ba, bạn chỉ chọn cấu hình.

**Thống nhất bậc giá:** chọn một logic chính. Với giấy tiêu dùng bán theo thùng, bậc theo *số lượng đơn vị* hợp lý hơn bậc theo giá trị đơn; nếu muốn cả hai, tách rõ "giá theo bậc số lượng" và "ưu đãi thêm theo giá trị đơn" thành hai loại `price_rule`.

### 6.5 Báo giá thay vì chỉ giỏ hàng

Học điểm mạnh của đối thủ: giỏ **Báo giá** riêng. Luồng: khách thêm SKU + số lượng → điền tên/SĐT/công ty/MST/địa chỉ nhận → gửi → vào hàng đợi `quote_request` trong admin (trạng thái Mới → Đã báo giá → Chốt/Huỷ), nhân viên gán người phụ trách, xuất Excel, nhắn Zalo. Thanh toán online là tuỳ chọn, giai đoạn sau.

### 6.6 Tin tức & nội dung

- 4 chuyên mục như đối thủ (Tin tức, Hướng dẫn chọn hàng, Khuyến mãi, Tuyển dụng).
- Editor khối (tiêu đề, ảnh, bảng, FAQ, khối "sản phẩm liên quan" chọn từ danh mục). Khối sản phẩm trong bài kéo giá trực tiếp từ dữ liệu, nên bài cũ không sai giá.
- Trường SEO mỗi bài/sản phẩm (title, description, slug, ảnh og), tự sinh JSON-LD Product/Offer, BreadcrumbList, FAQPage; sơ đồ site và redirect khi đổi slug.
- Bài mẫu hợp với catalogue của bạn: "Giấy vệ sinh nên mua cây hay lẻ?", "Chọn giấy ăn cho nhà hàng", "Pin than kẽm hay kiềm cho từng thiết bị".

### 6.7 Quản trị trang chủ

`home_section` cho phép bật/tắt và đổi thứ tự khối mà không cần lập trình: hero slider (ảnh desktop + ảnh mobile riêng), lưới hãng, sản phẩm theo nhóm hàng, deal có đếm ngược, tin tức, feedback, dải chính sách. Mỗi khối chọn nguồn dữ liệu từ bộ sưu tập.

### 6.8 Nhập liệu từ catalogue

1. Chuẩn hoá catalogue thành file Excel/CSV với cột: nhóm hàng, dòng sản phẩm, hãng, tên, ĐVT, quy đổi, mã SKU, giá, cờ cần xác nhận, ghi chú. (Mình đã trích được toàn bộ văn bản PDF; có thể tách thành file này nếu bạn muốn.)
2. Import theo `sku.code` (upsert) với bước **xem trước khác biệt** trước khi áp dụng.
3. Xuất bản theo `effective_from`.

### 6.9 Chọn nền tảng

| Phương án | Hợp khi | Hạn chế với catalogue này |
|---|---|---|
| **A. Sapo/Haravan** (như đối thủ) | Cần chạy nhanh, bán lẻ + đơn online | Mỗi đơn vị bán = một biến thể có SKU riêng thì khớp catalogue. Nhưng bậc giá theo số lượng, giá theo nhóm khách, bảng giá có phiên bản, báo giá phải dùng app/viết tay → quay lại bảng giá tĩnh |
| **B. Tự xây trên CMS headless** (Next.js + Payload/Strapi + Postgres) | B2B, cần bảng giá động, báo giá, nhiều bậc giá | Tốn công xây giai đoạn đầu, cần người bảo trì |
| **C. WordPress + WooCommerce** + plugin B2B/bậc giá | Đã quen WP, ngân sách vừa | Plugin bậc giá và đơn vị quy đổi hay xung đột, chậm khi catalogue lớn |

**Đề xuất: B nếu mục tiêu là bán sỉ/báo giá là chính** (69 SKU nhỏ nên chi phí xây vừa phải, bù lại bảng giá động là lợi thế cạnh tranh so với đối thủ). **A nếu cần ra mắt trong vài tuần và chấp nhận bảng giá cập nhật tay.** Đây là đánh giá của mình dựa trên dữ liệu trên; ngân sách, đội kỹ thuật và tần suất đổi giá của bạn mới là yếu tố quyết định.

### 6.10 Lộ trình

1. **Dữ liệu:** chuẩn hoá catalogue, xác nhận hai điểm còn nghi vấn (SV465, kích thước 175×120).
2. **Lõi:** danh mục/hãng/thuộc tính, sản phẩm + SKU đa đơn vị, bảng giá có hiệu lực, import.
3. **Mặt tiền:** trang chủ cấu hình được, trang nhóm hàng + lọc, trang sản phẩm có chọn đơn vị, `PriceTable`.
4. **B2B:** giỏ báo giá, nhóm khách, bậc giá, xuất Excel/PDF.
5. **Nội dung & SEO:** blog, landing theo ngành, JSON-LD, sitemap.
6. **Sau đó:** thanh toán online, công nợ đại lý, đồng bộ tồn kho.

## Câu hỏi còn mở

- Bán sỉ công khai giá hay chỉ cho đại lý đã duyệt?
- Có cần đặt hàng/thanh toán online ngay, hay báo giá + chốt qua Zalo/điện thoại là đủ?
- Ai cập nhật giá hằng tháng và qua công cụ nào (Excel hay phần mềm kế toán)?
- Hai điểm quy cách chưa rõ trong catalogue (SV465, 175×120) đã được xác nhận chưa?
- Ngân sách và thời gian ra mắt mong muốn, để chốt phương án A hay B.
