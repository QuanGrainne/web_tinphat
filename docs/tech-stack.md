# DNA web: tech stack (bootstrap bước 3)

Ngày: 2026-10-29. Do chủ dự án chỉ định: Next.js (FE) + Spring Boot (BE) + Postgres.

## Kiến trúc
```
Khách / Admin (trình duyệt)
        │
   Next.js (render theo request, cache 60 giây)   ──REST──►   Spring Boot API   ──►   Postgres
   - Storefront (A1-A16)                   - Catalogue, giá, quy cách
   - /admin (B1-B9)                        - Đơn hàng, báo giá
                                           - Nhập Excel KiotViet (preview diff)
                                           - Auth + 2 vai trò + audit log
                                           - Lưu ảnh (đĩa VPS, sao lưu ra bucket)
```
- Một ứng dụng Next.js chứa cả storefront và khu `/admin`. Một Spring Boot API cho cả hai.

## Quyết định đã nêu
- Phải tự viết toàn bộ admin (không có CMS dựng sẵn). Ước tính trong kế hoạch: 15,5-20 người-tuần cho giai đoạn 1 (`plans/261029-1949-dna-web-phase1/plan.md`).
- Chọn Java/Spring vì stack quen (suy đoán, chủ dự án xác nhận nếu khác).
- Phiên bản đã chốt ở kế hoạch (kiểm tra lại bản vá lúc dựng phase 2).

## Phiên bản đã chốt
| Thành phần | Phiên bản |
|---|---|
| Java | 21 (LTS) |
| Spring Boot | 4.1.2 (Flyway, Hibernate theo BOM) |
| PostgreSQL | 18 |
| Node | 24 |
| Next.js / React | 16.4.3 / 19.3.1 |
| Apache POI | 6.0.0 (dự phòng 5.5.1) |

## Thư viện
- BE: một module Maven, package theo tính năng. Spring Web, Spring Data JPA, Flyway, Spring Security (form login + HttpSession, bcrypt), Bean Validation, Apache POI (đọc Excel, giới hạn ZipSecureFile), Thumbnailator (ảnh JPEG/PNG), Testcontainers cho test (không dùng H2). Lỗi theo RFC 9457 ProblemDetail. Không có thư viện PDF phía máy chủ (in từ trình duyệt).
- FE: một ứng dụng Next.js (App Router, TypeScript) với hai root layout `(storefront)` và `(admin)`. Admin: antd 6 (vi_VN) + TanStack Query. Storefront: CSS thuần chuyển từ wireframe, không dùng Tailwind. Mã QR VietQR tự sinh (EMVCo) bằng `qrcode`.
- Triển khai: Docker Compose (caddy, web, api, db) trên VPS 4 GB, Cloudflare Free + Authenticated Origin Pulls, sao lưu `pg_dump` + ảnh ra R2.

## Rủi ro đã biết
- Admin tự viết là phần tốn công nhất. Giảm bằng cách: modal lớn cho sản phẩm + quy cách, bảng dùng chung, không làm tính năng ngoài spec.
- VPS nhỏ chạy JVM + Next.js + Postgres sát RAM: chọn tối thiểu 4 GB, đo thực tế.
- Cần người bảo trì VPS, sao lưu và vá lỗi sau khi ra mắt.

Nguồn nghiên cứu: `plans/reports/researcher-261029-platform-stack-options-report.md`, `plans/reports/researcher-261029-kiotviet-excel-api-report.md`.
