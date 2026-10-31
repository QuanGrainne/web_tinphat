# DNA web: quyết định yêu cầu (bootstrap bước 1)

Ngày: 2026-10-29. Nguồn đầy đủ: `feature-spec.md`. File này chỉ ghi các điểm đã chốt thêm khi bootstrap.

## Đã chốt
- Giá công khai cho mọi quy cách. Mỗi quy cách có cờ `hiện giá / liên hệ` để đổi sau, không cần tài khoản khách.
- Phí ship: web không tính. Nhân viên báo phí khi gọi xác nhận đơn rồi chốt tổng tiền. Bỏ mốc miễn ship khỏi Cài đặt giai đoạn 1.
- Giảm giá theo đơn lớn: chưa quyết. Xây bảng cấu hình bậc ưu đãi trong Cài đặt nhưng để trống (trống = tắt). Giá khuyến mại theo từng quy cách (có ngày bắt đầu/kết thúc) vẫn là tuỳ chọn trong B3.
- Phạm vi giai đoạn 1 theo `feature-spec.md` (A1-A16, B1-B9). Tài khoản khách, giá theo nhóm khách, API KiotViet thuộc giai đoạn sau.
- KiotViet là nguồn chính. Nối bằng Excel hoặc nhập tay, khoá nối là mã hàng. Web không quản lý tồn kho.
- Một người vận hành cả KiotViet và web. Thêm hàng mới ít nên nhập tay được.

## Vị trí dự án
- `D:\dna-web`, git nhánh `main`. Chưa commit.

## Còn mở (chưa chặn giai đoạn 1)
- Thùng/Dây trong catalogue đã là giá sỉ cuối chưa.
- Đơn tối thiểu, khu vực giao, giới hạn COD.
- Kênh báo đơn/báo giá mới: Zalo, email hay cả hai.
- Tên cột file Excel xuất từ KiotViet (cần mẫu thật).
- Domain, hosting, ngân sách vận hành hằng tháng.

## Decisions A-C (2026-10-29)
- A: Bỏ màn "Tổng quan" (dashboard) và màn xem nhật ký thay đổi khỏi giai đoạn 1. Nhật ký (`audit_log`) vẫn ghi; lịch sử giá vẫn xem trong form sản phẩm. Màn Người dùng tối giản: danh sách, tạo, đặt lại mật khẩu, khoá/mở lại, mở khoá đăng nhập. Vào admin mở thẳng danh sách Hàng hóa; chuông + danh sách yêu cầu cho biết việc mới. Wireframe `admin-dashboard.html` để "hoãn".
- B: Giữ bảng bậc ưu đãi trong Cài đặt (trống = tắt), nếu có thì máy chủ tự áp sau giá khuyến mại. Không làm thanh tiến độ trong giỏ. Đơn lưu một khoản giảm (`discount_total`) kèm ghi chú ngắn. Giá khuyến mại theo từng quy cách (ngày bắt đầu/kết thúc) giữ nguyên, tính lúc đọc.
- C: Form sản phẩm giữ dạng modal lớn kiểu KiotViet.
