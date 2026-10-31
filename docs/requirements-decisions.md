# DNA web: quyết định yêu cầu (bootstrap bước 1)

Ngày: 2026-10-29. Nguồn đầy đủ: `feature-spec.md`. File này chỉ ghi các điểm đã chốt thêm khi bootstrap.

## Đã chốt
- Giá công khai cho mọi quy cách. Mỗi quy cách có cờ `hiện giá / liên hệ` để đổi sau, không cần tài khoản khách.
- Phí ship: web không tính. Nhân viên báo phí khi gọi xác nhận đơn rồi chốt tổng tiền. Bỏ mốc miễn ship khỏi Cài đặt giai đoạn 1.
- Giảm giá theo đơn lớn: chưa áp dụng ở lần ra mắt (xem quyết định B bên dưới). Xây bảng cấu hình bậc ưu đãi trong Cài đặt nhưng để trống (trống = tắt). Giá khuyến mại theo từng quy cách (có ngày bắt đầu/kết thúc) vẫn là tuỳ chọn trong B3.
- Phạm vi giai đoạn 1 theo `feature-spec.md` (A1-A16, B1-B9). Tài khoản khách, giá theo nhóm khách, API KiotViet thuộc giai đoạn sau.
- KiotViet là nguồn chính. Nối bằng Excel hoặc nhập tay, khoá nối là mã hàng. Web không quản lý tồn kho.
- Một người vận hành cả KiotViet và web. Thêm hàng mới ít nên nhập tay được.

## Vị trí dự án
- `D:\dna-web`, git nhánh `main`.

## Còn mở (chưa chặn giai đoạn 1)
- Thùng/Dây trong catalogue đã là giá sỉ cuối chưa.
- Đơn tối thiểu, khu vực giao, giới hạn COD.
- Hộp thư nhận thông báo và tài khoản SMTP (kênh đã chốt: email).
- Tên cột file Excel xuất từ KiotViet (cần mẫu thật).
- Domain, hosting, ngân sách vận hành hằng tháng.

## Decisions A-C (2026-10-29)
- A: Bỏ màn "Tổng quan" (dashboard) và màn xem nhật ký thay đổi khỏi giai đoạn 1. Nhật ký (`audit_log`) vẫn ghi; lịch sử giá vẫn xem trong form sản phẩm. Vào admin mở thẳng danh sách Hàng hóa; chuông + danh sách yêu cầu cho biết việc mới. Wireframe `admin-dashboard.html` để "hoãn". (Màn Người dùng tối giản từng nằm trong quyết định này; đã hoãn bởi D2 bên dưới.)
- B: Giữ bảng bậc ưu đãi trong Cài đặt (trống = tắt), nếu có thì máy chủ tự áp sau giá khuyến mại. Không làm thanh tiến độ trong giỏ. Đơn lưu một khoản giảm (`discount_total`) kèm ghi chú ngắn. Giá khuyến mại theo từng quy cách (ngày bắt đầu/kết thúc) giữ nguyên, tính lúc đọc.
- C: Form sản phẩm giữ dạng modal lớn kiểu KiotViet.

## Quyết định bổ sung từ kế hoạch (2026-10-29)
- Nhãn tiết kiệm: > 0 thì "Tiết kiệm x,x%"; làm tròn về 0,0 thì "Bằng giá mua lẻ"; âm thì không hiện (câu hỏi mở: gói đắt hơn mua lẻ).
- Bậc ưu đãi trống = tắt; nếu có, áp phía máy chủ sau giá khuyến mại, thành một khoản `discount_total` + `discount_note`. Giá khuyến mại theo quy cách tính lúc đọc.
- KiotViet là nguồn chính của mã hàng, tên, đơn vị, quy đổi, giá. Web sở hữu ảnh, mô tả, danh mục, thương hiệu, SEO, hiển thị.
- Mã đơn `DNA` + 6 ký tự Crockford (ví dụ `DNA7K2M9Q`); báo giá `BG` + 6 ký tự. Trang đơn tra bằng mã đơn + SĐT, không có link kèm token.
- Thông báo đơn/báo giá mới bằng email: bắt buộc trước khi ra mắt. Zalo để sau.
- Tài khoản ngân hàng chỉ Quản lý sửa; đổi ngân hàng hoặc email chủ cần nhập lại mật khẩu và gửi email cảnh báo. "Đã nhận tiền" bằng tay chỉ Quản lý (xem Session 2: webhook cũng được đặt).
- Giá trên web có thể trễ tới ~60 giây so với admin; đơn được tính lại giá phía máy chủ khi gửi.

## Validation Session 1 (2026-10-29)
- Ngưỡng cảnh báo lệch giá: 2%, cả hai chiều.
- Một tài khoản Quản lý duy nhất, không dự phòng (chủ dự án chấp nhận rủi ro khôi phục phải vào máy chủ); vai trò Biên tập giữ nhưng chưa dùng.
- Xuất PDF bằng in từ trình duyệt (CSS in); Excel xuất phía máy chủ.
- KiotViet đổi tên hàng: chỉ cập nhật tên quy cách/đơn vị; tên hiển thị sản phẩm do web giữ.
- Quy cách Thùng (`SV465-4L- T80`) và Dây 8 (`SV465-4L- G8`) hiện "Liên hệ" và gắn cờ nội bộ cho đến khi xác nhận quy cách đóng gói.

## Validation Session 2 (2026-10-29)
- W1: webhook báo biến động số dư của SePay (dịch vụ thông báo, tiền vẫn vào tài khoản công ty) + QR EMVCo tự tạo. Casso là phương án dự phòng; payOS bị loại (là cổng thanh toán, trái với phần D của spec).
- W2: giao dịch khớp chính xác (mã đơn trong nội dung, đúng số tiền, đúng tài khoản, tiền vào, đơn chuyển khoản đang "Đã xác nhận") thì hệ thống đặt "Đã nhận tiền", tác nhân nhật ký `BANK_WEBHOOK`; còn lại vào hàng chờ đối soát, không đổi trạng thái đơn. "Đã nhận tiền" bằng tay của Quản lý giữ làm dự phòng.
- QR có số tiền chỉ hiện sau khi nhân viên xác nhận tổng tiền; trước đó chỉ hiện số tài khoản và nội dung chuyển khoản.

## Validation Session 3 (2026-10-30)
- D1: khăn 175x120 (`SV300-3L-Gói`, `SP000014`) hiện giá in sẵn, không cờ; chủ dự án sửa sau nếu sai. Chỉ hai quy cách SV465 giữ "Liên hệ" + cờ.
- D2: hoãn màn Người dùng và API của nó. Giữ vai trò Biên tập và tài khoản Quản lý tạo lúc khởi động; tạo, khoá, đặt lại mật khẩu theo quy trình SQL ở phase 8 (khởi động lại máy chủ xoá độ trễ đăng nhập).
