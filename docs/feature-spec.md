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
| A1 | Trang chủ | Banner (ảnh desktop + mobile riêng), lưới nhóm hàng, lưới thương hiệu, sản phẩm theo nhóm, tin mới, dải cam kết (VAT, hotline), chân trang. Khối bật/tắt và đổi thứ tự được | 1 |
| A2 | Menu và danh mục | Menu theo cây 2 cấp, tự sinh từ cây admin. Breadcrumb | 1 |
| A3 | Trang nhóm hàng | Banner, danh sách sản phẩm, **bộ lọc** theo thương hiệu và thuộc tính của nhóm (số lớp, cỡ pin…), sắp xếp, phân trang | 1 |
| A4 | Trang thương hiệu | Logo, banner, mô tả, sản phẩm của hãng, lọc theo nhóm. Tự sinh từ dữ liệu | 1 |
| A5 | Tìm kiếm | Theo tên, mã hàng, thương hiệu; gợi ý khi gõ | 1 |
| A6 | Trang sản phẩm | Ảnh, mô tả, thông số; **chọn quy cách (Gói/Dây/Thùng)** hiển thị đúng giá, mã, "= 50 gói"; nhãn "Giá đã gồm VAT"; nút Thêm vào giỏ / Thêm vào báo giá; sản phẩm liên quan | 1 |
| A7 | Bảng giá / catalogue online | Trang tra cứu tự sinh từ dữ liệu: lọc theo nhóm/hãng, tìm mã, nhập số lượng, thêm vào báo giá; **tải Excel** (PDF: in từ trình duyệt, không có thư viện PDF phía máy chủ). Quy cách "Liên hệ" không lộ giá ở bất kỳ đầu ra công khai nào | 1 |
| A8 | Giỏ báo giá | Chọn mã + số lượng, nhập tên, SĐT, công ty, MST, địa chỉ, ghi chú → gửi yêu cầu | 1 |
| A9 | Giỏ hàng và đặt hàng | Giỏ, form người nhận, chọn **COD** hoặc **chuyển khoản**; trang xác nhận kèm mã đơn. Không bắt đăng ký tài khoản. Mã đơn dạng `DNA` + 6 ký tự (Crockford), báo giá `BG` + 6 ký tự | 1 |
| A9b | Trang đơn hàng | Mở ngay sau khi đặt và qua "Tra cứu đơn" (mã đơn + SĐT, không có link kèm token). Mã đơn, thanh trạng thái, mặt hàng, tổng tiền, khối thanh toán (xem A10), dòng "Nhân viên xác nhận tồn kho, phí giao và tổng tiền" | 1 |
| A10 | Chuyển khoản | **Chờ xác nhận:** chỉ hiện số tài khoản và nội dung chuyển khoản (= mã đơn), chưa có QR. **Sau khi nhân viên xác nhận tổng tiền:** QR động (số tiền + nội dung). Đơn chuyển khoản đang "Đã xác nhận" tự chuyển "Đã nhận tiền" khi giao dịch khớp chính xác (mã đơn trong nội dung, đúng số tiền, đúng tài khoản, tiền vào); mọi trường hợp khác vào hàng chờ đối soát, không đổi trạng thái đơn | 1 |
| A11 | Tra cứu đơn | Nhập SĐT + mã đơn để xem trạng thái (mở trang A9b) | 1 |
| A12 | Tin tức và hướng dẫn | Danh sách theo chuyên mục, trang bài viết, bài liên quan, khối sản phẩm trong bài | 1 |
| A13 | Trang tĩnh | Giới thiệu, chính sách (đổi trả, vận chuyển, thanh toán, bảo mật), liên hệ + bản đồ | 1 |
| A14 | Liên hệ nhanh | Nút gọi và Zalo cố định; form liên hệ | 1 |
| A15 | Giao diện mobile | Thanh điều hướng đáy (Danh mục, Trang chủ, Tra cứu đơn, Báo giá), nút CTA dính đáy ở trang sản phẩm, lọc và sắp xếp dạng ngăn kéo, lưới 2 cột | 1 |
| A16 | SEO | Tiêu đề/mô tả/slug theo từng trang, sitemap, dữ liệu có cấu trúc (sản phẩm, breadcrumb, tổ chức), redirect khi đổi slug | 1 |
| A17 | Tài khoản khách, lịch sử đơn | Đăng nhập, đơn cũ, đặt lại | 2 |
| A18 | Giá theo nhóm khách / ẩn giá | Giá sỉ sau khi duyệt | 2 (nếu cần) |
| A19 | Hiển thị giá sỉ theo quy cách | Mỗi quy cách hiện **đơn giá/gói** và **"tiết kiệm x% so với mua lẻ"** (làm tròn về 0,0 thì "Bằng giá mua lẻ"; đắt hơn mua lẻ thì không hiện), tự tính, không nhập tay | 1 |
| A20 | Giá khuyến mại | Giá gạch + giá bán + nhãn Sale, tự hết hạn theo ngày kết thúc | 1 (nếu DNA có khuyến mại) |
| A21 | Ưu đãi theo giá trị đơn | Bậc ưu đãi áp tự động sau giá khuyến mại theo bảng bậc trong Cài đặt (trống = tắt). Không có thanh tiến độ trong giỏ; đơn chỉ có một khoản giảm | 1 (nếu DNA chọn áp dụng) |

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
- **Form sản phẩm là modal lớn kiểu KiotViet** (quyết định chủ dự án 29/10/2026), 3 tab Thông tin / Mô tả / SEO: tên, thương hiệu, danh mục, ảnh, mô tả, thuộc tính theo nhóm, SEO.
- **Thẻ "Quy cách & giá" trong cùng modal:** đơn vị, số lượng quy đổi (theo đơn vị cơ bản), **mã hàng (khoá nối KiotViet)**, giá đã gồm VAT, hiện giá / liên hệ, hiện/ẩn. Có hiển thị "1 Thùng = 50 Gói" và cảnh báo khi giá lệch quá ngưỡng (2%, cả hai chiều) so với đơn giá × quy đổi.
- Cờ nội bộ **"Cần xác nhận quy cách"** theo từng quy cách (`needs_confirmation`) cùng ghi chú nội bộ của sản phẩm: chỉ admin thấy, khách không thấy nhãn. Quy cách có cờ để "Liên hệ" cho đến khi chủ dự án xác nhận.
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
- Thông báo **email** khi có yêu cầu mới (bắt buộc trước khi ra mắt); Zalo là tuỳ chọn, làm sau.

### B6. Đơn hàng
- Danh sách đơn từ web, lọc theo trạng thái và hình thức thanh toán.
- Luồng trạng thái: Chờ xác nhận → Đã xác nhận → (chuyển khoản) Đã nhận tiền → **Đã nhập KiotViet** (đánh dấu và ghi mã đơn KiotViet) → Đang giao → Hoàn tất / Huỷ.
- "Đã nhận tiền" do Quản lý đặt tay (dự phòng) hoặc do hệ thống khi webhook ngân hàng khớp chính xác (tác nhân `BANK_WEBHOOK` ghi trong nhật ký). Giao dịch không khớp vào hàng chờ đối soát (chỉ Quản lý liên kết hoặc bỏ qua).
- Giá lưu **chốt tại thời điểm đặt**, không đổi khi giá sản phẩm đổi sau. Giá trên web có thể trễ tới ~60 giây; đơn được tính lại giá phía máy chủ khi gửi. Giảm giá khuyến mại thấy theo từng dòng; bậc ưu đãi lưu thành **một khoản giảm** (`discount_total`) kèm ghi chú ngắn để nhân viên nhập đúng vào KiotViet.
- Xuất đơn ra Excel để nhập vào KiotViet. In phiếu đơn.
- Đơn web là "yêu cầu đặt hàng" cần nhân viên xác nhận tồn trước khi giao, vì web không biết tồn.

### B7. Nội dung
- Tin tức: 4 chuyên mục, soạn bài theo khối (tiêu đề, ảnh, bảng, FAQ, khối sản phẩm lấy giá trực tiếp), SEO từng bài.
- Trang tĩnh (giới thiệu, chính sách, liên hệ).
- Cấu hình trang chủ: banner (ảnh desktop + mobile), thứ tự và bật/tắt khối.

### B8. Cài đặt
- Thông tin công ty (tên, MST, địa chỉ trụ sở, kho, SĐT, email), logo, mạng xã hội.
- Tài khoản ngân hàng nhận chuyển khoản (chỉ Quản lý; đổi tài khoản hoặc email chủ cần nhập lại mật khẩu và gửi email cảnh báo).
- **Bảng bậc ưu đãi theo giá trị đơn** (mốc, % giảm; trống = tắt). Một nơi duy nhất, không viết cứng trong code. Không có mốc miễn phí giao: web không tính phí giao.
- Văn bản dải cam kết (VAT, hotline).

### B9. Tài khoản và nhật ký
- **Hai vai trò** giữ trong hệ thống: Biên tập (nội dung), Quản lý (giá, xoá, xuất bản, cài đặt, đối soát ngân hàng).
- Giai đoạn 1 **không có màn Người dùng** (hoãn, quyết định 30/10/2026): chỉ có một tài khoản Quản lý tạo lúc khởi động; khôi phục, tạo, khoá tài khoản theo quy trình kỹ thuật (xem phase 8 của kế hoạch).
- Nhật ký thay đổi giá, quy đổi, xuất bản, trạng thái đơn **vẫn được ghi**; không có màn xem nhật ký (lịch sử giá xem trong modal sản phẩm, lịch sử đơn trong chi tiết đơn).
- **Không có màn Tổng quan** ở giai đoạn 1 (hoãn, quyết định 29/10/2026): `/admin` mở thẳng danh sách Hàng hóa.

## C. Dữ liệu cốt lõi

```
brand(tên, logo, banner, mô tả, seo)
category(cha, tên, slug, ảnh, thứ tự, bộ thuộc tính)
product(tên, brand, category, ảnh, mô tả, thuộc tính{}, seo, trạng thái)
sku(product, mã hàng*, code_key, đơn vị, quy đổi, giá, giá_km, km_từ, km_đến, nguồn[nhập tay|KiotViet],
    hiện/ẩn, price_visible, needs_confirmation)                  -- *khoá nối KiotViet; code_key = dạng chuẩn hoá để so khớp
discount_tier(mốc giá trị đơn, % giảm)                            -- trống = tắt; không có mốc miễn phí giao
price_history(sku, giá cũ, giá mới, người, thời điểm)
category_map(nhóm KiotViet → category)
slug_history(đối tượng, slug cũ) / redirect
import_batch(file, bản xem trước JSONB, trạng thái, version)      -- nhập Excel KiotViet
app_setting(khoá, giá trị)                                        -- công ty, ngân hàng, dải cam kết, ngưỡng lệch giá
quote_request(khách, mặt hàng[sku, sl], trạng thái, người phụ trách, ghi chú)
order(khách, địa chỉ, hình thức thanh toán, mặt hàng[sku, sl, giá chốt], discount_total, discount_note,
      paid_amount, trạng thái, mã đơn KiotViet)
bank_transaction(mã giao dịch nhà cung cấp, số tiền, nội dung, tài khoản, chiều, thời điểm, order?, trạng thái[khớp|đối soát|bỏ qua])
contact_message(tên, SĐT, nội dung)
post(chuyên mục, nội dung, seo) / page / home_section / user / audit_log
```

## D. Không làm ở giai đoạn 1 (YAGNI)

Tồn kho, giá vốn, thẻ kho, tích điểm, in tem mã, đa chi nhánh, loại hàng Hàng sản xuất/Combo, cổng thanh toán online (không gồm webhook báo biến động số dư từ dịch vụ thông báo như SePay; tiền vẫn vào thẳng tài khoản công ty), màn Tổng quan, màn xem nhật ký, màn Người dùng, bậc giá tự động theo số lượng, tài khoản khách, đồng bộ API KiotViet (làm khi lượng thay đổi đủ lớn để Excel thành gánh nặng).

## E. Lộ trình

Lộ trình, thứ tự phase và ước lượng công: `plans/261029-1949-dna-web-phase1/plan.md` (8 phase, làm tuần tự 1, 2, 3, 5, 6, 7, 4, 8).

## Quyết định đã chốt

Chi tiết và ngày chốt: `requirements-decisions.md`.

- Giá công khai, từng quy cách có cờ Hiện giá / Liên hệ. Phí giao do nhân viên nhập, web không tính. Thông báo bằng email.
- Bậc ưu đãi: có bảng cấu hình, trống = tắt, một khoản giảm mỗi đơn. Cảnh báo lệch giá 2% hai chiều.
- Chuyển khoản: QR động sau khi nhân viên xác nhận tổng tiền; webhook ngân hàng khớp chính xác thì tự "Đã nhận tiền".
- Không có màn Tổng quan, xem nhật ký, Người dùng ở giai đoạn 1.

## Câu hỏi còn mở

- Khu vực giao hàng (toàn quốc hay một số tỉnh)? Đơn tối thiểu, giới hạn giá trị COD?
- Giá Thùng/Dây trong catalogue đã là giá sỉ cuối cùng, hay đại lý lớn còn thương lượng thêm?
- Có phân biệt khách lẻ và đại lý không? (giai đoạn 2)
- Bảng ánh xạ cột trong file Excel KiotViet có đúng như dự đoán không (cần xuất thử một file để xác minh; chỉ chặn phase 4)?
- Ngân hàng của công ty và khả năng liên kết SePay; hộp thư và tài khoản SMTP; tên 4 chuyên mục tin (xem bảng "Owner deliverables" trong kế hoạch).
