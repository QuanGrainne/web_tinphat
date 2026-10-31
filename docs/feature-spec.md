# Tổng hợp chức năng web DNA Hoàng Nguyên

Ngày: 29/10/2026 | Phạm vi: giai đoạn 1.

## 0. Bối cảnh chốt

- Web **trưng bày catalogue, nhận báo giá, nhận đặt hàng COD hoặc chuyển khoản**. Không quản lý tồn kho.
- **KiotViet là nguồn chính** cho hàng hóa và đơn hàng. Đơn nhận từ web được nhân viên nhập vào KiotViet.
- Một người vận hành cả KiotViet lẫn web. Hàng mới ít, **thêm thủ công trên web là chấp nhận được**.
- Giai đoạn 1 chưa dùng API KiotViet; dữ liệu qua nhập tay hoặc Excel xuất từ KiotViet.
- Catalogue: 6 nhóm hàng, 32 dòng sản phẩm, 69 mã quy cách (Gói/Dây/Thùng), giá đã gồm VAT.

Nguyên tắc dữ liệu: **mã hàng là khoá nối** với KiotViet. Giá, đơn vị, quy đổi thuộc KiotViet. Ảnh, mô tả, danh mục web, thương hiệu, SEO thuộc web.

---

## A. Website dành cho khách

| # | Chức năng | Mô tả ngắn | GĐ |
|---|---|---|---|
| A1 | Trang chủ | Banner (ảnh desktop + mobile riêng), lưới nhóm hàng, lưới thương hiệu, sản phẩm theo nhóm, tin mới, dải cam kết (giao hàng, VAT), chân trang. Khối bật/tắt và đổi thứ tự được | 1 |
| A2 | Menu và danh mục | Menu theo cây 2 cấp, tự sinh từ cây admin. Breadcrumb | 1 |
| A3 | Trang nhóm hàng | Banner, danh sách sản phẩm, **bộ lọc** theo thương hiệu và thuộc tính của nhóm (số lớp, cỡ pin…), sắp xếp, phân trang | 1 |
| A4 | Trang thương hiệu | Logo, banner, mô tả, sản phẩm của hãng, lọc theo nhóm. Tự sinh từ dữ liệu | 1 |
| A5 | Tìm kiếm | Theo tên, mã hàng, thương hiệu; gợi ý khi gõ | 1 |
| A6 | Trang sản phẩm | Ảnh, mô tả, thông số; **chọn quy cách (Gói/Dây/Thùng)** hiển thị đúng giá, mã, "= 50 gói"; nhãn "Giá đã gồm VAT"; nút Thêm vào giỏ / Thêm vào báo giá; sản phẩm liên quan | 1 |
| A7 | Bảng giá / catalogue online | Trang tra cứu tự sinh từ dữ liệu: lọc theo nhóm/hãng, tìm mã, nhập số lượng, thêm vào báo giá; **tải PDF/Excel** | 1 |
| A8 | Giỏ báo giá | Chọn mã + số lượng, nhập tên, SĐT, công ty, MST, địa chỉ, ghi chú → gửi yêu cầu | 1 |
| A9 | Giỏ hàng và đặt hàng | Giỏ, form người nhận, chọn **COD** hoặc **chuyển khoản**; trang xác nhận kèm mã đơn. Không bắt đăng ký tài khoản | 1 |
| A10 | Chuyển khoản | Hiển thị số tài khoản, mã QR, **nội dung chuyển khoản = mã đơn** | 1 |
| A11 | Tra cứu đơn | Nhập SĐT + mã đơn để xem trạng thái | 1 |
| A12 | Tin tức và hướng dẫn | Danh sách theo chuyên mục, trang bài viết, bài liên quan, khối sản phẩm trong bài | 1 |
| A13 | Trang tĩnh | Giới thiệu, chính sách (đổi trả, vận chuyển, thanh toán, bảo mật), liên hệ + bản đồ | 1 |
| A14 | Liên hệ nhanh | Nút gọi và Zalo cố định; form liên hệ | 1 |
| A15 | Giao diện mobile | Thanh điều hướng đáy (Danh mục, Trang chủ, Tra cứu đơn, Báo giá), nút CTA dính đáy ở trang sản phẩm, lọc và sắp xếp dạng ngăn kéo, lưới 2 cột | 1 |
| A16 | SEO | Tiêu đề/mô tả/slug theo từng trang, sitemap, dữ liệu có cấu trúc (sản phẩm, breadcrumb, tổ chức), redirect khi đổi slug | 1 |
| A17 | Tài khoản khách, lịch sử đơn | Đăng nhập, đơn cũ, đặt lại | 2 |
| A18 | Giá theo nhóm khách / ẩn giá | Giá sỉ sau khi duyệt | 2 (nếu cần) |
| A19 | Hiển thị giá sỉ theo quy cách | Mỗi quy cách hiện **đơn giá/gói** và **"tiết kiệm x% so với mua lẻ"**, tự tính, không nhập tay | 1 |
| A20 | Giá khuyến mại | Giá gạch + giá bán + nhãn Sale, tự hết hạn theo ngày kết thúc | 1 (nếu DNA có khuyến mại) |
| A21 | Ưu đãi theo giá trị đơn | Thanh tiến độ trong giỏ "mua thêm X để giảm Y%", áp tự động theo bảng bậc trong Cài đặt | 1 (nếu DNA chọn áp dụng) |

## B. Trang quản trị

### B1. Danh mục (cây sản phẩm)
- Cây tối đa **2 cấp**, kéo thả đổi thứ tự.
- Mỗi danh mục: tên, slug, ảnh, mô tả, SEO, ẩn/hiện.
- Nhóm cấp 1 gắn **bộ thuộc tính** riêng (giấy: số tờ, số lớp; pin: cỡ, điện áp).
- Xoá nhóm còn sản phẩm: **chặn**, có nút "chuyển sản phẩm rồi xoá". Đổi slug tự tạo redirect.

### B2. Thương hiệu
- Tên, logo, banner, mô tả, SEO, thứ tự, ẩn/hiện.
- Tạo nhanh ngay trong form sản phẩm.
- Gộp thương hiệu trùng. Xoá khi còn sản phẩm: chặn.

### B3. Sản phẩm và quy cách
- Danh sách: bảng + panel lọc (danh mục, thương hiệu, trạng thái, "cần bổ sung"), thao tác hàng loạt (đổi danh mục, ẩn/hiện).
- **Form sản phẩm là một trang** (không phải popup): tên, thương hiệu, danh mục, ảnh, mô tả, thuộc tính theo nhóm, SEO.
- **Bảng quy cách trong cùng trang:** đơn vị, số lượng quy đổi (theo đơn vị cơ bản), **mã hàng (khoá nối KiotViet)**, giá đã gồm VAT, hiện/ẩn. Có hiển thị "1 Thùng = 50 Gói" và cảnh báo khi giá lệch nhiều so với đơn giá × quy đổi.
- Nhân bản sản phẩm, lưu nháp/xuất bản. Xuất bản cần có ảnh, danh mục, ít nhất một quy cách có giá.
- **Ngừng bán** thay cho xoá: sản phẩm ẩn nhưng giữ URL và lịch sử.
- Nguồn dữ liệu của mỗi quy cách: nhãn **"Nhập tay"** hoặc **"Từ KiotViet"**.
- Giá: lưu **lịch sử thay đổi** (ai, khi nào, giá cũ/mới).
- **Giá khuyến mại** từng quy cách: giá, ngày bắt đầu, ngày kết thúc. Hết hạn tự về giá thường.

### B4. Đồng bộ KiotViet (Excel)
- Tải lên file Excel xuất từ KiotViet → **xem trước khác biệt** ("3 mã mới, 2 đổi giá, 1 ngừng bán, 1 mã lệch") → Áp dụng.
- Khớp theo mã hàng. Mã mới vào danh sách "Cần bổ sung". Mã ngừng kinh doanh ở KiotViet thì web tự ẩn. Mã nhập tay mà khác giá KiotViet thì báo lệch để chọn bên đúng.
- Bảng ánh xạ "nhóm hàng KiotViet → danh mục web" để lần sau tự gán.
- Hiển thị "Cập nhật lần cuối: …".
- Dùng cho: nạp dữ liệu ban đầu, cập nhật giá hàng loạt, đối chiếu định kỳ. Không bắt buộc cho mỗi lần thêm hàng.

### B5. Báo giá
- Hàng đợi yêu cầu báo giá: trạng thái Mới → Đã báo giá → Chốt / Huỷ, người phụ trách, ghi chú.
- Xem chi tiết (mã, số lượng, thông tin khách), **xuất Excel/PDF** để gửi lại.
- Thông báo Zalo hoặc email khi có yêu cầu mới.

### B6. Đơn hàng
- Danh sách đơn từ web, lọc theo trạng thái và hình thức thanh toán.
- Luồng trạng thái: Chờ xác nhận → Đã xác nhận → (chuyển khoản) Đã nhận tiền → **Đã nhập KiotViet** (đánh dấu và ghi mã đơn KiotViet) → Đang giao → Hoàn tất / Huỷ.
- Giá lưu **chốt tại thời điểm đặt**, không đổi khi giá sản phẩm đổi sau. Lưu riêng **khoản giảm đã áp** (khuyến mại, bậc ưu đãi) để nhân viên nhập đúng vào KiotViet.
- Xuất đơn ra Excel để nhập vào KiotViet. In phiếu đơn.
- Đơn web là "yêu cầu đặt hàng" cần nhân viên xác nhận tồn trước khi giao, vì web không biết tồn.

### B7. Nội dung
- Tin tức: 4 chuyên mục, soạn bài theo khối (tiêu đề, ảnh, bảng, FAQ, khối sản phẩm lấy giá trực tiếp), SEO từng bài.
- Trang tĩnh (giới thiệu, chính sách, liên hệ).
- Cấu hình trang chủ: banner (ảnh desktop + mobile), thứ tự và bật/tắt khối.

### B8. Cài đặt
- Thông tin công ty (tên, MST, địa chỉ trụ sở, kho, SĐT, email), logo, mạng xã hội.
- Tài khoản ngân hàng nhận chuyển khoản.
- **Bảng bậc ưu đãi theo giá trị đơn** (mốc, % giảm, mốc miễn phí giao). Một nơi duy nhất, không viết cứng trong code.
- Văn bản dải cam kết, phí và điều kiện giao hàng nếu có.

### B9. Người dùng và nhật ký
- **Hai vai trò**: Biên tập (nội dung), Quản lý (giá, xoá, xuất bản, cài đặt).
- Nhật ký thay đổi giá, quy đổi, xuất bản.

## C. Dữ liệu cốt lõi

```
brand(tên, logo, banner, mô tả, seo)
category(cha, tên, slug, ảnh, thứ tự, bộ thuộc tính)
product(tên, brand, category, ảnh, mô tả, thuộc tính{}, seo, trạng thái)
sku(product, mã hàng*, đơn vị, quy đổi, giá, giá_km, km_từ, km_đến, nguồn[nhập tay|KiotViet], hiện/ẩn)   -- *khoá nối KiotViet
setting_promo_ladder(mốc giá trị đơn, % giảm) + mốc miễn phí giao
price_history(sku, giá cũ, giá mới, người, thời điểm)
category_map(nhóm KiotViet → category)
quote_request(khách, mặt hàng[sku, sl], trạng thái, người phụ trách, ghi chú)
order(khách, địa chỉ, hình thức thanh toán, mặt hàng[sku, sl, giá chốt], trạng thái, mã đơn KiotViet)
post(chuyên mục, nội dung, seo) / page / home_section / user / audit_log / redirect
```

## D. Không làm ở giai đoạn 1 (YAGNI)

Tồn kho, giá vốn, thẻ kho, tích điểm, in tem mã, đa chi nhánh, loại hàng Hàng sản xuất/Combo, cổng thanh toán online, bậc giá tự động theo số lượng, tài khoản khách, đồng bộ API KiotViet (làm khi lượng thay đổi đủ lớn để Excel thành gánh nặng).

## E. Lộ trình

1. **Nền:** xuất thử Excel KiotViet, chốt quy ước mã hàng, dựng cây danh mục và thương hiệu, nạp 69 mã.
2. **Quản trị lõi:** B1–B4, B8–B9.
3. **Mặt tiền:** A1–A8, A12–A16.
4. **Bán hàng:** A9–A11, B5–B6.
5. **Hoàn thiện:** SEO, kiểm thử mobile, nội dung đầu tiên.
6. **Sau:** tài khoản khách, giá theo nhóm khách, API KiotViet.

## Câu hỏi còn mở

- Phí giao hàng và điều kiện miễn phí? Có đơn tối thiểu không?
- Khu vực giao hàng (toàn quốc hay một số tỉnh)? COD có giới hạn giá trị không?
- Báo giá và đơn hàng thông báo qua kênh nào (Zalo, email, cả hai)?
- Giá hiển thị công khai toàn bộ hay một phần "liên hệ"?
- DNA có giảm theo đơn lớn không (mốc, %, có cộng dồn với giá khuyến mại không)?
- Giá Thùng/Dây trong catalogue đã là giá sỉ cuối cùng, hay đại lý lớn còn thương lượng thêm?
- Có phân biệt khách lẻ và đại lý không? Giá sỉ hiện công khai hay sau khi duyệt?
- Bảng ánh xạ cột trong file Excel KiotViet có đúng như dự đoán không (cần xuất thử một file để xác minh)?
