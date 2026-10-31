# DNA Hoàng Nguyên: design guidelines

Ngày: 29/10/2026 | Phạm vi: storefront (A1-A16) + admin (B1-B9) giai đoạn 1. Wireframe tham chiếu: `docs/wireframes/index.html`. Token dùng chung nằm ở `docs/wireframes/dna.css` (`:root`), admin thêm `admin.css`. Khi code Next.js/Tailwind: map token này vào `theme.extend`.

## 1. Hướng thương hiệu

- Nguồn: catalogue PDF 2026 (trang bìa). Có logo tròn (huy hiệu xanh-vàng-đỏ), đã trích ra `wireframes/assets/logo.png` (383×385, nền trắng; cần file gốc vector/PNG nền trong từ DNA).
- Tính cách: **rõ ràng, đáng tin, thực dụng** (B2B bán sỉ, giá công khai). Bìa catalogue là nền navy đậm + thanh sky/đỏ + khối vàng; ta giữ nguyên "ngôn ngữ" này: navy là chủ đạo, vàng là điểm nhấn hành động, số thứ tự 01-06 màu vàng.
- Thông điệp lặp lại: "Quy cách rõ ràng. Lựa chọn thuận tiện." Mọi giá hiển thị kèm "đã gồm VAT".
- Ảnh: 3 ảnh thật trích từ catalogue (giấy, pin, khăn ướt) dùng làm mẫu. Sản phẩm chưa có ảnh dùng ô placeholder kẻ chéo, không dùng ảnh AI/ảnh mạng. Ảnh sản phẩm nền trắng, `object-fit: contain`.
- Tránh: bắt chước giao diện pinhongngoc.com (đỏ-vàng, banner khuyến mãi dày, đồng hồ đếm ngược). Chỉ lấy cấu trúc: báo giá ngang hàng giỏ hàng, dock mobile, lọc dạng ngăn kéo.

## 2. Màu (token)

| Token | Hex | Dùng cho |
|---|---|---|
| `navy-900` | #012745 | Màu thương hiệu: header phụ, hero, nút chính, tiêu đề, sidebar admin (lấy từ bìa catalogue) |
| `navy-800/700` | #0B3A63 / #16507F | Hover, link, nhấn phụ |
| `navy-50/100` | #EEF4F9 / #DBE7F2 | Nền nhạt, hover hàng bảng |
| `sky-400` | #5CCBF0 | Eyebrow trên nền navy, focus ring, thanh trang trí (từ catalogue) |
| `sky-100` | #DEF5FC | Quy cách đang chọn, badge "mới", ghi chú thông tin |
| `gold-500` | #C6A04A | **CTA báo giá**, gạch chân nav active, số 01-06 (từ catalogue) |
| `gold-700` | #7D6016 | Chữ vàng trên nền trắng/vàng nhạt (đạt tương phản) |
| `gold-100` | #F8F0DC | Hộp B2B, hàng cảnh báo |
| `red-600` | #C8141B | Chỉ cho: Sale, lỗi, ngừng bán, xoá. Màu catalogue #ED1C24 chỉ dùng cho thanh trang trí hero (không dùng cho chữ) |
| `green-700` | #0B7A4B | Tiết kiệm, đang hiện, thành công |
| `ink / ink-2 / muted` | #0F1F2E / #44566A / #5D6C7B | Chữ chính / phụ / chú thích (đều ≥ 4.5:1 trên trắng) |
| `line / bg` | #D9E2EA / #F5F8FB | Viền, nền khối |

Quy tắc: 1 màu hành động chính mỗi màn hình. Báo giá = vàng nền, chữ navy (tương phản 6,2:1). Thêm vào giỏ/Gửi/Áp dụng = navy nền, chữ trắng. Đỏ không dùng trang trí.

## 3. Chữ

- **Tiêu đề: Be Vietnam Pro** (500/600/700/800), **nội dung + số liệu: IBM Plex Sans** (400/500/600). Cả hai hỗ trợ đầy đủ tiếng Việt (ă â đ ê ô ơ ư và dấu thanh), thiết kế bởi/được kiểm cho tiếng Việt.
- Lý do chọn: Be Vietnam Pro vẽ dấu tiếng Việt chuẩn, nét hình học vững cho tiêu đề; Plex Sans có chữ số đều (tabular) rõ, mã hàng và giá dễ quét, hợp tính "tra cứu bảng giá" của B2B. Mã hàng dùng `ui-monospace`.
- Tải: `<link>` Google Fonts với `display=swap`, chỉ các weight trên. Production dùng `next/font` (self-host, subset `vietnamese` + `latin`).
- Giá và số lượng luôn `font-variant-numeric: tabular-nums`. Định dạng giá `428.500đ` (dấu chấm ngăn nghìn, "đ" liền sau số), thập phân dùng dấu phẩy (`0,6%`).

| Bậc | Desktop / Mobile | Weight | Dùng cho |
|---|---|---|---|
| Display | 46 / 28 | 800 | Hero |
| H1 | 40 / 28 (trang SP 30 / 22) | 800 | Tiêu đề trang |
| H2 | 30 / 22 | 700 | Tiêu đề khối |
| H3 | 20 | 700 | Tiêu đề card |
| Body | 16 (line-height 1.55) | 400 | Nội dung |
| Small | 14 | 400-600 | Ô bảng, nhãn |
| Caption | 12 | 500 | VAT, chú thích, badge |
| Admin base | 14 / ô bảng 13 | 400 | Admin dày |

## 4. Khoảng cách, bo góc, đổ bóng

- Thang 4 px: 4, 8, 12, 16, 24, 32, 48. Khoảng khối: 48 desktop / 32 mobile. Gap lưới card 16 (mobile 12).
- Container 1280 max, padding 24 (mobile 16). Breakpoint: 768 (mobile → desktop), 1100 (thu lưới).
- Bo góc: 6 (nút, input), 10 (card), 16 (band). Bóng: `sh-1` card thường, `sh-2` hover/drawer. Phần lớn dùng viền 1 px thay bóng.

## 5. Component

**Nút:** cao 44 (admin 32), bo 6. Gold = báo giá, Primary navy = giỏ/gửi, Ghost = phụ. Trạng thái: hover đổi nền, focus ring 3 px sky, disabled opacity .45 + `title` giải thích.

**Product card:** ảnh 4:3 (placeholder kẻ chéo + 2 chữ cái hãng), nhãn hãng (vàng đậm, in hoa), tên (2 dòng), thông số ngắn (cỡ, số lớp, mã dòng), **giá "Từ" quy cách nhỏ nhất + `/ gói`**, chip các quy cách (`Gói`, `Dây · 5 gói`, `Thùng · 50 gói`), nhãn tiết kiệm (nếu có), 2 nút `+ Báo giá` / `Chọn mua` (mobile chỉ còn Báo giá, bấm thẻ để chọn). Sale: badge đỏ góc ảnh + giá cũ gạch.

**Chọn quy cách (unit selector):** nhóm radio dạng thẻ (`role=radiogroup`), mỗi thẻ: tên đơn vị, "= N gói", giá. Chọn → viền navy 2 px + nền sky-100 + dấu ✓. Mặc định chọn quy cách lớn nhất. Dưới thẻ có khung nét đứt:
- `Mã hàng` (chip mã + nút sao chép), `Quy đổi` ("1 Thùng = 50 gói"), `Đơn giá` ("8.570đ / gói" + nhãn).
- Nhãn so sánh tính tự động từ giá, không nhập tay: quy cách Gói = "Giá mua lẻ"; đơn giá/gói thấp hơn Gói = badge xanh **"Tiết kiệm x% so với mua lẻ"** (≥1% làm tròn nguyên, <1% một số lẻ: "0,6%"); bằng nhau = badge xám "Bằng giá mua lẻ". Tuyệt đối không hiện "0%".
- Chỉ có 2 quy cách thì lưới 2 cột. Giá lớn ở khối giá phía trên cập nhật theo lựa chọn (`aria-live=polite`).

**Khối giá:** số lớn 36 (mobile 30) Be Vietnam Pro 800 + `/ thùng` + badge "Giá đã gồm VAT"; dòng dưới: "= 50 gói · đơn giá 8.570đ/gói" + nhãn. Cờ "liên hệ" thay giá bằng nút "Liên hệ báo giá" (cùng kích thước).

**Giỏ báo giá (quote cart):** hàng = ảnh 64, tên, chọn quy cách (select chip), mã, đơn giá + đơn giá/gói, stepper số lượng, thành tiền, xoá. Cột phải (sticky): số mã, tổng số lượng, "Phí giao: nhân viên báo khi xác nhận", **tạm tính đã gồm VAT**, ghi chú "giá tham khảo, báo giá chính thức do nhân viên gửi", nút gold "Gửi yêu cầu báo giá", nút "Tải bản nháp Excel". Form: họ tên*, SĐT*, công ty, MST, địa chỉ, ghi chú. Thanh tiến độ ưu đãi chỉ hiện khi bảng bậc ưu đãi có dữ liệu (hiện đang trống = tắt).

**Badge trạng thái:** cao 22, bo tròn. Màu theo nghĩa, luôn kèm chữ (không chỉ màu): `Bản nháp` vàng; `Xuất bản`/`Đang hiện`/`Tiết kiệm` xanh; `Ngừng bán`/`Chưa có ảnh`/`Lỗi` đỏ nhạt; `Mới`/`Từ KiotViet` sky; `Nhập tay` vàng nhạt; `Sale` đỏ đặc. Trạng thái đơn/báo giá: Mới (sky) → Đã báo giá (vàng) → Chốt (xanh) / Huỷ (xám).

**Bộ lọc:** nhóm checkbox có số đếm theo kết quả; chip lọc đang áp dụng có nút xoá; nút "Xoá lọc". Thuộc tính lọc theo bộ thuộc tính của nhóm (pin: cỡ; giấy: số lớp, số tờ).

## 6. Mobile (thiết kế từ 390 px, tối thiểu 320)

- Header: logo + gọi + giỏ; ô tìm kiếm xuống dòng riêng full-width. Mega menu → nút Danh mục ở dock.
- **Dock đáy 4 nút:** Danh mục, Trang chủ, Tra cứu đơn, Báo giá (kèm số mã). Cao 64, nút ≥ 44, mục đang chọn có vạch vàng trên đầu. Nút Gọi/Zalo nổi chỉ hiện desktop; mobile dùng số trong topbar + icon gọi.
- **Trang sản phẩm / giỏ báo giá:** dock được thay bằng **thanh CTA dính đáy** (sản phẩm: stepper + "Thêm báo giá" + "Thêm vào giỏ"; giỏ báo giá: tổng tạm tính + "Gửi yêu cầu"). Chừa `padding-bottom` để không che nội dung.
- Lưới sản phẩm **2 cột**; hãng và tin cuộn ngang (scroll-snap). Danh mục 2 cột.
- **Lọc/sắp xếp:** 2 nút dính đầu danh sách mở ngăn kéo từ dưới (cao ≤ 82vh, nền mờ, nút "Xem N kết quả"). Sắp xếp nằm trong ngăn kéo.
- Bảng quy cách / bảng giá cuộn ngang trong khung riêng, không làm cuộn ngang cả trang. Kiểm: `scrollWidth ≤ clientWidth` ở 390 px.
- Chú thích wireframe (`.anno`) ẩn ở mobile.

## 7. Admin (/admin)

- Dày, thiên về bảng: font 14, ô bảng 13, hàng cao ~36, input cao 32, nút cao 32. Sidebar navy 224 px cố định (nhóm Hàng hoá, Bán hàng, Nội dung, Hệ thống) + topbar 52 px có breadcrumb và trạng thái.
- **Form sản phẩm một trang**, không popup: dải 4 ô tóm tắt (trạng thái, điều kiện xuất bản, cảnh báo giá, nguồn dữ liệu) → thông tin chung + ảnh → **bảng quy cách** → thuộc tính + mô tả → SEO + lịch sử giá. Thanh hành động dính đáy: Huỷ / Lưu nháp / Xuất bản (khoá kèm lý do khi thiếu điều kiện).
- **Bảng quy cách:** cột Đơn vị, Quy đổi (+ "1 Thùng = 100 Gói"), Mã hàng (monospace), Giá đã gồm VAT, Đơn giá/gói (tự tính), Giá khuyến mại (giá + ngày bắt đầu/kết thúc), Nguồn (`Từ KiotViet` / `Nhập tay`), Hiển thị giá (Hiện giá / Liên hệ), Hiện/Ẩn (toggle). Hàng cảnh báo nền vàng nhạt; dòng cảnh báo ngay dưới hàng, nêu số liệu cụ thể:
  - **Lệch giá nội bộ:** giá lệch > ngưỡng (đề xuất 2%, cấu hình trong Cài đặt) so với đơn giá cơ bản × quy đổi.
  - **Khác KiotViet:** mã nhập tay khác giá KiotViet + lựa chọn "Giữ giá web / Lấy giá KiotViet".
  - Mã `Từ KiotViet` khoá giá và quy đổi, muốn sửa phải chuyển sang Nhập tay.
- **Đồng bộ Excel:** thanh file (tên, số dòng, khớp cột) → 5 ô KPI (Mã mới, Đổi giá, Ngừng KD, Mã lệch, Không đổi; viền trái mã màu) → mỗi loại một bảng có checkbox từng dòng + "Chọn tất cả" → bảng ánh xạ nhóm KiotViet → danh mục web (nhóm chưa ánh xạ tô vàng) → thanh dính đáy "Áp dụng N thay đổi". Giá cũ gạch ngang, giá mới đậm, chênh lệch có mũi tên và %; chưa ghi gì cho đến khi bấm Áp dụng.
- Phân quyền hiển thị: Biên tập không thấy cột giá chỉnh được và nút Xuất bản (vai trò Quản lý).

## 8. Truy cập (WCAG 2.1 AA)

- Tương phản: chữ thường ≥ 4.5:1, chữ lớn/UI ≥ 3:1 (token ở mục 2 đã chọn theo ngưỡng này; gold-500 chỉ làm nền nút có chữ navy, không làm chữ).
- Mọi phần tử tương tác có focus ring rõ (`:focus-visible`, 3 px sky), thao tác bàn phím được cho chọn quy cách, stepper, ngăn kéo (Esc đóng khi code thật).
- Vùng chạm ≥ 44×44 px trên mobile. Không truyền đạt chỉ bằng màu (badge luôn có chữ, cảnh báo có icon).
- Ngữ nghĩa: `nav` có `aria-label`, breadcrumb, `radiogroup` cho quy cách, `aria-live` cho giá, nhãn `label` cho mọi input, `alt` cho ảnh sản phẩm.
- `prefers-reduced-motion`: tắt transition. Chuyển động chỉ ≤ 250 ms (hover, ngăn kéo).
- Ngôn ngữ trang `lang="vi"`; kiểm tra dấu hiển thị đúng ở mọi weight đã tải.

## 9. Ghi chú dữ liệu ảnh hưởng thiết kế

- Trong 69 mã catalogue, giá quy cách lớn gần như luôn bằng đơn giá × quy đổi. Chỉ 2 dòng có chênh (SV6C Cây: 2%, SV1510 Cây: 0,6%). Nhãn "tiết kiệm" sẽ hiếm xuất hiện cho tới khi DNA đặt giá sỉ thấp hơn; UI đã xử lý trường hợp "bằng giá mua lẻ".
- Có 2 điểm quy cách cần xác nhận (SV465; kích thước 175×120): thiết kế cần cờ "cần xác nhận quy cách" trên quy cách (hiện chỉ dự phòng ở admin, chưa vẽ).
- Phí giao không tính trên web: mọi nơi hiện "nhân viên báo khi xác nhận", không có dòng phí = 0.
