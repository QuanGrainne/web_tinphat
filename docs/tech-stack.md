# DNA web: tech stack (bootstrap bước 3)

Ngày: 2026-10-29. Do chủ dự án chỉ định: Next.js (FE) + Spring Boot (BE) + Postgres.

## Kiến trúc
```
Khách / Admin (trình duyệt)
        │
   Next.js (SSR/ISR cho SEO)   ──REST──►   Spring Boot API   ──►   Postgres
   - Storefront (A1-A16)                   - Catalogue, giá, quy cách
   - /admin (B1-B9)                        - Đơn hàng, báo giá
                                           - Nhập Excel KiotViet (preview diff)
                                           - Auth + 2 vai trò + audit log
                                           - Lưu ảnh (đĩa VPS, sao lưu ra bucket)
```
- Một ứng dụng Next.js chứa cả storefront và khu `/admin`. Một Spring Boot API cho cả hai.
- Triển khai: Docker Compose trên VPS Việt Nam, Cloudflare phía trước (SSL, cache tài nguyên tĩnh).
- Sao lưu: `pg_dump` hằng ngày + thư mục ảnh ra bucket ngoài VPS.

## Quyết định đã nêu
- Phải tự viết toàn bộ admin (không có CMS dựng sẵn). Công xây lớn hơn phương án Payload trong báo cáo nền tảng; chưa ước tính chính thức, sẽ có ở bước lập kế hoạch.
- Chọn Java/Spring vì stack quen (suy đoán, chủ dự án xác nhận nếu khác).
- Chốt phiên bản cụ thể (Java LTS, Spring Boot, Next.js, Postgres) lúc lập kế hoạch, kiểm tra bản mới nhất.

## Thư viện dự kiến (kiểm tra lại lúc lập kế hoạch)
- BE: Spring Web, Spring Data JPA, Flyway (migration), Spring Security, Apache POI hoặc FastExcel (đọc Excel), Bean Validation.
- FE: Next.js App Router, TypeScript, Tailwind, thư viện component cho admin (bảng, form).

## Rủi ro đã biết
- Admin tự viết là phần tốn công nhất. Giảm bằng cách: form một trang cho sản phẩm + quy cách, bảng dùng chung, không làm tính năng ngoài spec.
- VPS nhỏ chạy JVM + Next.js + Postgres sát RAM: chọn tối thiểu 4 GB, đo thực tế.
- Cần người bảo trì VPS, sao lưu và vá lỗi sau khi ra mắt.

Nguồn nghiên cứu: `plans/reports/researcher-261029-platform-stack-options-report.md`, `plans/reports/researcher-261029-kiotviet-excel-api-report.md`.
