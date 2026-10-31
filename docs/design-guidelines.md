# Design guidelines: web DNA Hoàng Nguyên

Ngày: 29/10/2026 | Bản v3 (storefront làm lại theo bố cục pinhongngoc + phong cách KiotViet).
Wireframe: `docs/wireframes/index.html` (ảnh chụp trong `docs/wireframes/screenshots/`).

**Nguyên tắc nguồn:** catalogue PDF chỉ là nguồn DỮ LIỆU (tên hàng, đơn vị, quy đổi, mã hàng, giá đã gồm VAT). Không dùng màu, logo, ảnh hay bố cục của nó. Admin và storefront cùng phong cách KiotViet; bố cục storefront theo pinhongngoc.

---

## 1. Admin = bản đồ mẫu KiotViet

Nguồn đã xem: `kiotviet-style-notes.md` và ảnh trong `Downloads/omts-srs-md/plans/261028-1300-kiotviet-reference/kiotviet-guide/images/` (viết tắt `KV/`). Không dùng logo hay tên KiotViet: chữ "DNA" thuần văn bản.

### 1.1 Token (admin.css)

| Token | Giá trị | Ghi chú |
|---|---|---|
| Thanh menu chính | `#0041C5`, chữ trắng 14px/500, tab đang chọn tối hơn (phủ đen 24%) | `KV/retail-bao-cao/tong-quan/02.png` |
| Primary (nút Lưu, pill bật, link) | `#0070F4`, hover `#005BC4` | |
| Chữ / chữ phụ / viền | `#1F2937` / `#6B7280` / `#D1D5DB` (viền nhạt `#E5E7EB`) | |
| Nền trang / thẻ / chọn-hover | `#F3F4F6` / `#FFFFFF` / `#E8F1FF` | |
| Header bảng | `#E1E9F5` (xanh xám nhạt), hàng tổng in đậm ngay dưới | `KV/retail-hang-hoa/danh-sach-hang-hoa/02.png` |
| Trạng thái | ok `#16A34A`, lỗi `#DC2626`, cảnh báo nền `#FEF3C7`, chữ `#B45309` | Chỉ dùng trong badge và hộp cảnh báo |
| Font | Inter 13px thân bài, tiêu đề trang 20px/700, ô nhập 34px, hàng bảng 40px | Inter, dùng chung với storefront |
| Lưới / bo góc | 8px, bo 4px (ô nhập, nút), 8px (thẻ, dialog) | |
| Canvas | 1440px, lề trang 48px, cột lọc 250px | Admin chỉ làm desktop |

### 1.2 Thành phần và nguồn

| Thành phần | Cách làm trong wireframe | Nguồn KiotViet |
|---|---|---|
| Thanh tiện ích trắng | Chữ "DNA" + bell (chấm đỏ), gear, avatar, "Hỗ trợ" | `KV/retail-hang-hoa/danh-sach-hang-hoa/02.png` |
| Menu xanh toàn chiều rộng | Tổng quan / Hàng hóa / Báo giá & đơn hàng / Nội dung / Đồng bộ KiotViet / Cài đặt; nút trắng bên phải "Xem website" (thay "Bán hàng") | cùng ảnh |
| Đầu trang danh sách | Tiêu đề, ô tìm có icon lọc, `+ Tạo mới` (viền xanh), `Import file`, `Xuất file`, icon cột, gear, `?` | `.../danh-sach-hang-hoa/05.png`, `retail-khach-hang/khach-hang/03.png` |
| Cột lọc trái | Khối có tiêu đề đậm, link "Tạo mới" nền xanh nhạt, ô chọn, radio "Toàn thời gian / Tùy chỉnh", pill Tất cả/Có/Không | `.../danh-sach-hang-hoa/03.png`, `10.png` |
| Bảng | Checkbox + sao + ảnh nhỏ, hàng tổng đậm, hover `#E8F1FF`, chân "Hiển thị 15 dòng" + phân trang | `.../danh-sach-hang-hoa/05.png` |
| Dòng mở rộng | Viền xanh 2px, tab Thông tin / Mô tả / Lịch sử giá, 2 cột nhãn-giá trị, hàng nút cuối (Ngừng kinh doanh, Sao chép, Chỉnh sửa) | `.../danh-sach-hang-hoa/07.png`, `09.png` (nền sau modal) |
| Dialog nhỏ giữa màn | Tiêu đề 18px + ✕, nhãn trên ô, chân: `Bỏ qua` (viền xám) + `Lưu` (xanh) | `.../danh-sach-hang-hoa/03.png` (Tạo nhóm hàng), `12.png` (Tạo vị trí) |
| Modal lớn sửa hàng | Tab Thông tin / Mô tả / SEO, thẻ gập có tiêu đề + chevron, ảnh bên phải (1 chính + 3 ô), chân modal: checkbox "Hiển thị trên web" + `Bỏ qua` + `Lưu` | `.../danh-sach-hang-hoa/17.png`, `09.png` |
| Link "Tạo mới" cạnh Nhóm hàng / Thương hiệu | Mở dialog nhỏ chồng lên modal | `.../danh-sach-hang-hoa/07.png`, `10.png` |
| Xác nhận xóa | "X đang gắn với N mã hàng. Bạn có chắc chắn muốn xóa ... với tất cả N mã hàng?" + `Bỏ qua` / `Đồng ý`, chồng trên dialog Sửa thương hiệu | `.../danh-sach-hang-hoa/10.png` |
| Dialog Import | Hai cột câu hỏi radio, "Chọn file dữ liệu", chip tên file có ✕, nút hành động | `.../danh-sach-hang-hoa/32.png` |
| Dashboard | Thẻ kết quả hôm nay (3 chỉ số), biểu đồ cột + tab Theo ngày/giờ/thứ + chọn "Tháng này", cột phải: việc cần làm (icon cam, số xanh) + "Hoạt động gần đây" | `KV/retail-bao-cao/tong-quan/02.png` |
| Form trang đầy đủ, bảng tổng bên phải | Dùng cho khung chi tiết đơn (cột trái mặt hàng, cột phải tổng tiền, hai nút cuối) | `KV/retail-giao-dich/nhap-hang/05.png` |
| Hàng nhãn / mô tả / điều khiển | Dùng khi làm màn Cài đặt (nhãn đậm, mô tả xám, điều khiển bên phải) | `KV/retail-thiet-lap/thiet-lap-cua-hang/03.png` |
| Bong bóng trợ giúp | Góc dưới phải, nền xanh `#0066DD`, chữ "Hỗ trợ" | mọi ảnh KV |

### 1.3 Khác KiotViet (giữ dáng, đổi nội dung)

- Không có tồn kho, giá vốn, điểm, vị trí, trọng lượng. Thay bằng: hiển thị web, nguồn giá, khuyến mại có ngày.
- Bảng danh sách: một dòng = một **dòng sản phẩm** (32); cột "Quy cách" đếm mã (69). Mã cơ bản hiện ở cột đầu; các mã còn lại ở dòng mở rộng.
- Modal sản phẩm có 3 tab Thông tin / Mô tả / SEO. Thẻ **"Quy cách & giá"** là thẻ gập mở sẵn, gồm bảng: Đơn vị, Quy đổi (gói), Mã hàng, Giá đã gồm VAT, Đơn giá/gói (tự tính), Giá khuyến mại + từ/đến ngày, Nguồn giá (Nhập tay | Từ KiotViet), Hiển thị giá (Hiện giá | Liên hệ), công tắc Hiện/ẩn.
- **Cảnh báo lệch giá** nằm ngay dưới bảng (hộp vàng): "Giá Thùng lệch +3,2% so với 80 × giá Gói và khác giá KiotViet", kèm hai lựa chọn "dùng giá KiotViet" / "giữ giá nhập tay". Ô lệch viền cam, dòng phụ cam. Ngưỡng cấu hình ở Cài đặt (gợi ý 2%).
- Cờ "Cần xác nhận quy cách" lấy từ ghi chú catalogue (SV465: dây 8 hay 10 gói; 175x120 chưa rõ đơn vị). Hiện badge vàng ở danh sách và nhãn cho khách ở storefront.
- **Import có bước 2 "Xem trước thay đổi"** (KiotViet không có): 5 ô số (mã mới, đổi giá, ngừng kinh doanh, lệch giá, không đổi), bảng diff có checkbox từng dòng, dòng lệch có radio chọn bên đúng, nút `Áp dụng N thay đổi`. Hết bước 2 mới ghi dữ liệu.
- Luồng trạng thái hiển thị bằng thanh bước (chấm tròn): Báo giá Mới > Đã báo giá > Chốt/Hủy; Đơn Chờ xác nhận > Đã xác nhận > (Đã nhận tiền nếu chuyển khoản) > Đã nhập KiotViet > Đang giao > Hoàn tất. Phí giao do nhân viên nhập tay khi xác nhận.
- Dữ liệu minh họa luôn có nhãn vàng "Dữ liệu minh họa" hoặc ghi chú wireframe. Mã hàng, tên hàng, đơn vị, giá lấy đúng catalogue.

---

## 2. Storefront = bố cục pinhongngoc + phong cách KiotViet

**Quy tắc chủ dự án:** BỐ CỤC lấy từ `https://pinhongngoc.com/`; MÀU và KIỂU lấy từ KiotViet (đúng token admin, mục 1.1), nên storefront và admin là một họ sản phẩm. Không dùng phong cách riêng của thương hiệu, không dùng gì từ catalogue PDF ngoài dữ liệu.

### 2.1 Mẫu bố cục lấy từ pinhongngoc

Ảnh tham chiếu nằm ở `docs/reference-pinhongngoc/` (viết tắt `REF/`); mô tả cấu trúc ở `docs/reference-site-analysis.md` (mục 3-4). Đã mở trực tiếp trang hãng bản mobile 390 để đối chiếu.

| Mẫu lấy | Cách làm ở DNA | Nguồn |
|---|---|---|
| Thanh tối trên cùng: hotline (nút nổi), tra cứu đơn | `.util`: "Tra cứu đơn" + nút xanh "Hotline: 0366 985 679". Ẩn trên mobile | `REF/home-d-0.png` |
| Header: logo, nút DANH MỤC, ô tìm, 3 icon Báo giá / Kiểm tra đơn / Giỏ hàng kèm số | Giữ nguyên thứ tự; nút tìm xanh thay nút vàng; icon tròn viền xám, dòng phụ "3 sản phẩm" | `REF/home-d-0.png`, `REF/brand-d-top.png` |
| Hàng menu + nút nổi bật bên phải | Thanh xanh `#0041C5` như admin; nút trắng "Đại lý & Mua sỉ" (thay nút đỏ) | `REF/home-d-0.png` |
| Banner tràn chiều ngang | Banner xanh phẳng: 1 tiêu đề, 1 dòng, 1 nút, chấm trượt. Không ảnh | `REF/home-d-0.png`, `REF/mobile-composite.png` (ô 1) |
| Hàng "Thương hiệu pin": ô ảnh lớn + nhãn ngắn | "Nhóm hàng" (6 ô) và "Thương hiệu" (5 ô). Desktop một hàng; mobile lưới 3 cột | `REF/home-d-0.png`, `REF/mobile-composite.png` (ô 1) |
| Tiêu đề khối (thanh ngang giữa trang) + hàng 5 thẻ + nút "Xem thêm sản phẩm" | `.sec-t` nền `#E8F1FF` chữ xanh; lưới 5 cột desktop, 2 cột mobile (4 thẻ) | `REF/home-d-1.png`, `REF/mobile-composite.png` (ô 5-6) |
| Thẻ: ảnh to, tên 2 dòng, giá, 1 nút rộng hết thẻ | Giống hệt; nút "Chọn mua"; desktop thêm chip đơn vị nhỏ | `REF/home-d-1.png`, `REF/brand-d-top.png` |
| Trang hãng/nhóm: breadcrumb, banner, cột lọc trái (tiêu đề khối có vạch màu bên trái), thanh "Xếp theo" dạng chip, lưới 4 cột | Giữ nguyên; banner là dải xanh phẳng có tên nhóm | `REF/brand-d-top.png` |
| Mobile trang hãng: 2 nút "Lọc sản phẩm" / "Sắp xếp" mở ngăn kéo, lưới 2 cột | Giữ; ngăn kéo là bottom sheet (CSS `:target`, mở bằng `#filter`, `#sort`) | `REF/mobile-composite.png` (ô 2), `REF/brand-m-top.png` |
| Trang sản phẩm: gallery trái, thông tin phải; mã hàng; giá lớn; "Giá đã gồm VAT"; ô Số lượng; 2 nút | Giữ; thêm ô chọn đơn vị ngay dưới giá. Bố cục desktop dựa trên mô tả ở `reference-site-analysis.md` mục 3 (chưa chụp lại bản desktop) | `REF/prod-m-top.png`, `REF/mobile-composite.png` (ô 3) |
| Mobile sản phẩm: ảnh vuông trên cùng, thanh CTA dính đáy | Thanh dính 2 nút "Thêm báo giá" / "Thêm vào giỏ", thay dock ở trang này | `REF/prod-m-top.png` |
| Dock đáy 4 nút: Danh mục, Trang chủ, Theo dõi đơn, Báo giá (nút đang chọn tô màu, có số) | Giữ nguyên 4 nút và thứ tự; chọn = xanh `#0070F4` | `REF/mobile-composite.png` (hàng dưới) |
| Trang Báo giá: danh sách sản phẩm + khung "Sản phẩm cần báo giá" và form bên phải | Danh sách dòng bên trái + khung tổng và form bên phải (sticky) | `REF/quote-d-top.png` |
| Bong bóng "Liên hệ" nổi góc phải | Chỉ desktop, tròn xanh. Mobile bỏ (ở mobile của ref nó đè lên thẻ) | `REF/home-d-0.png`, `REF/mobile-composite.png` |

**Không lấy:** đồng hồ đếm ngược và thanh "Ưu đãi", nhãn Sale đỏ và giá gạch, khung khuyến mãi theo giá trị đơn, tab mô tả dài, đoạn văn SEO, ảnh sản phẩm, màu đỏ / vàng / đen của họ.

### 2.2 Phong cách = token KiotViet

Dùng lại `admin.css`: nav `#0041C5`, primary `#0070F4` (hover `#005BC4`), chữ `#1F2937`, chữ phụ `#6B7280`, viền `#D1D5DB` / `#E5E7EB`, nền xám `#F3F4F6` (ô ảnh, tiêu đề bảng), chọn `#E8F1FF`, lỗi `#DC2626`, ok `#16A34A`, vàng cảnh báo `#FEF3C7` / `#B45309`, bo góc 4px, font Inter (có tập vietnamese), lưới 4/8px.

| Phần tử | Quy định (storefront.css) |
|---|---|
| Giá | Xanh `#0070F4` đậm; thẻ 15-17px, trang sản phẩm 28 (mobile) / 34 (desktop) 800. Đơn vị `/ gói` xám nhỏ |
| Màu đỏ | Chỉ cho số đếm trên icon và nhãn Sale nếu sau này có khuyến mại. Không dùng cho giá |
| Huy hiệu tiết kiệm | Nền xanh lá nhạt `#DCFCE7`, chữ `#15803D`, tròn |
| Nút | Chính: nền `#0070F4` chữ trắng. Phụ: viền xanh chữ xanh. Cao 44 (mobile) / 42 (desktop), thẻ 40. Bo 4px |
| Ảnh sản phẩm / ô nhóm | Khung xám `#F3F4F6` + icon ảnh xám, chỗ giữ cho ảnh thật (nền sáng, tỉ lệ 1:1) |
| Banner | Nền `#0070F4` phẳng, vài hình tròn `#005BC4` / `#0041C5`; chữ trắng; không ảnh |
| Logo | Chữ thuần: "DNA" Inter 800 xanh `#0041C5` + "Hoàng Nguyên" Inter 600 (HTML/CSS, không ảnh) |
| Chân trang | Nền `#111827`, chữ `#D1D5DB`, thông tin pháp lý thật (tên công ty, MST, địa chỉ, kho, điện thoại, email) |
| Breakpoint | Mobile-first; desktop từ 960px. Khung nội dung tối đa 1344px, lề 24 (desktop) / 12 (mobile) |
| Thang chữ | Thân 14; tên thẻ 13-14 semibold; tiêu đề khối 15-18 hoa; H1 trang 19-24; ô nhập 16 (mobile) để iOS không phóng to |

### 2.3 Quy tắc chữ ngắn

- Không đoạn giải thích, không khối "cách đặt hàng", không câu quảng bá, không ghi chú wireframe trong trang (ghi chú chỉ nằm ở `index.html`).
- Tiêu đề khối 1-3 từ: Nhóm hàng, Thương hiệu, Giấy Sen Vàng, Cùng nhóm.
- Thẻ sản phẩm chỉ có: tên, giá, nút (desktop thêm chip đơn vị; nhãn vàng "Cần xác nhận quy cách" khi có cờ).
- Dải tin cậy: tối đa một dải mỏng 3 mục ("Giá đã gồm VAT", "Giao toàn quốc", "Hotline 0366 985 679").
- Không phí giao, không số tồn, không bậc giảm giá trên web. Giá công khai.

### 2.4 Chọn đơn vị (Gói / Dây / Thùng)

- **Thẻ:** "Từ 8.570đ / gói" (giá của đơn vị nhỏ nhất); sản phẩm một đơn vị bỏ chữ "Từ". Nút "Chọn mua" dẫn tới trang sản phẩm.
- **Trang sản phẩm:** ba ô lớn (Gói / Dây / Thùng), mỗi ô có tên đơn vị, quy đổi ("50 gói") và giá. Số ô bằng số quy cách thật (SV6C chỉ có Gói và Cây). Ô đang chọn viền xanh 2px nền `#E8F1FF`.
- **Ô đang chọn quyết định:** giá lớn và hậu tố đơn vị, mã hàng (font mono, nguyên văn), một dòng nhỏ "1 thùng = 50 gói · 8.570đ / gói" (chỉ khi không phải đơn vị nhỏ nhất; đơn giá/gói tự tính), thành tiền và tổng số gói theo số lượng (stepper).
- **Huy hiệu "Tiết kiệm x,x%":** `(giá gói × quy đổi − giá quy cách) / (giá gói × quy đổi)`; chỉ hiện khi > 0 và làm tròn không về 0,0; không bao giờ hiện "0%". Ví dụ SV6C Cây: 364.750đ so với 12 × 31.000đ = 372.000đ, tiết kiệm 1,9%. Gấu trúc Dây / Thùng bằng đơn giá gói nên không có huy hiệu.
- **Bảng "Tất cả quy cách":** desktop 4 cột (Đơn vị, Quy đổi, Mã hàng, Giá); mobile mỗi quy cách là hàng xếp dọc (đơn vị + quy đổi bên trái, giá bên phải, mã hàng dòng dưới). Bấm hàng cũng chọn quy cách. Không cuộn ngang.
- **Hai nút:** "Thêm báo giá" (viền xanh) và "Thêm vào giỏ" (xanh đặc). Giỏ báo giá và giỏ hàng là hai giỏ riêng, cả hai đều có số đếm ở header.
- Xem trạng thái trong wireframe bằng `#thung` và `#sv6c`.

### 2.5 Quy tắc mobile

- Từ 390px. Header: logo giữa, giỏ hàng bên phải (số đếm đỏ), ô tìm xuống dòng dưới; Danh mục / Báo giá / Kiểm tra đơn chuyển xuống dock.
- Dock đáy 60px: Danh mục, Trang chủ, Theo dõi đơn, Báo giá (số đếm). Trang sản phẩm và giỏ hàng thay dock bằng thanh CTA dính (không chồng hai thanh).
- Lưới sản phẩm **2 cột** (khớp A15 và ref); nhóm hàng 3 cột. Thẻ chỉ có tên, giá, nút nên không bị cắt chữ; chip đơn vị chỉ có trên desktop.
- Lọc và sắp xếp là hai nút; mỗi nút mở bottom sheet (lọc cao 88%, chân có "Xóa lọc" + "Xem N sản phẩm").
- Vùng bấm ≥ 44px. Không cuộn ngang: đã đo `scrollWidth == clientWidth` ở 390px cho cả 5 màn.
- Giá nằm trong màn đầu của trang sản phẩm (ảnh 4:3, thumbnail nhỏ).

---

## 3. Quy tắc chung

**Giọng văn tiếng Việt:** ngắn, lịch sự, xưng "bạn" hoặc "Quý khách" ở nội dung dài; nút dùng động từ ("Thêm báo giá", "Thêm vào giỏ", "Gửi yêu cầu báo giá", "Áp dụng 7 thay đổi"). Thông báo lỗi nói rõ cần sửa gì.

**Số, ngày, tiền:** tiền kiểu `428.500đ` (dấu chấm ngăn nghìn, hậu tố `đ`, không số lẻ); trong bảng admin bỏ `đ` ở cột đã có tiêu đề. Phần trăm dùng dấu phẩy: `1,9%`. Ngày `29/10/2026`, giờ `17:40`. Số điện thoại `0366 985 679`. Số lượng quy đổi viết "= 50 gói".

**VAT:** luôn ghi "Giá đã gồm VAT" ở dải tin cậy trang chủ, trang sản phẩm, giỏ báo giá, giỏ hàng và chân trang. Không hiển thị giá chưa VAT. Web không tính phí giao và không quản lý tồn kho: dùng câu "Nhân viên xác nhận tồn kho, phí giao và tổng tiền".

**Mã hàng:** hiển thị nguyên văn như dữ liệu (ví dụ `SP000019`, `SV465-4L- Gói`, `SVRĐ1280t 6G`), font mono, cho phép chép, không tự chuẩn hóa hay đổi dấu cách. Tìm kiếm phải khớp cả khi gõ thiếu dấu.

**Dữ liệu chưa chắc:** hiển thị nhãn vàng "Cần xác nhận ..." thay vì giấu; admin thấy ghi chú nội bộ.

**Trợ năng (tối thiểu WCAG 2.1 AA):** tương phản chữ thân ≥ 4,5:1; focus nhìn thấy được (viền xanh 2px, ô nhập có thêm quầng xanh); mọi nút icon có `aria-label`; trạng thái không chỉ bằng màu (huy hiệu luôn kèm chữ); thứ tự tab theo thứ tự đọc; `prefers-reduced-motion` tắt chuyển động; `lang="vi"`; điều khiển dùng phần tử thật (button, radio, select) để bàn phím và trình đọc màn hình hoạt động; vùng giá dùng `aria-live="polite"` khi đổi quy cách.

**Hiệu năng:** một họ font (Inter), tự host tập con latin + vietnamese, `font-display: swap`; ảnh WebP, kích thước khai báo sẵn để không nhảy bố cục.
