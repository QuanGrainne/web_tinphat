---
phase: 1
title: "Spec and wireframe alignment"
status: pending
priority: P1
effort: "0.3 pw (estimate)"
dependencies: []
---

# Phase 1: Spec and wireframe alignment

## Overview

Docs-only phase. Make `docs/` agree with the locked decisions in `plan.md` before code starts, so phases 3, 5 and 6 build against one truth. No code, no schema.

## Requirements

- Every contradiction listed under "Contradictions found" is resolved in the docs.
- Wireframes stay runnable static HTML (open `docs/wireframes/index.html` in a browser).
- Rejected v1 design is removed from the repo.

### Contradictions found (verified by grep, 2026-10-29)

| # | Where | Conflict | Fix |
|---|---|---|---|
| C1 | `docs/wireframes/store-home.html:49`, `docs/design-guidelines.md:110` | "Giao toàn quốc" claimed; delivery area is still open (`docs/requirements-decisions.md:18`) | Remove item; strip = "Giá đã gồm VAT" + "Hotline 0366 985 679" |
| C2 | `docs/design-guidelines.md:54,109,144`, `docs/wireframes/store-listing.html:114`, `docs/wireframes/admin-product-edit.html:174` | "Cần xác nhận quy cách" shown to customers | Admin-only per-SKU flag `needs_confirmation` (badge "Cần xác nhận quy cách") + product internal note; remove storefront tag and the "Hiện nhãn ... cho khách" checkbox. Alignment [V4]: `admin-product-edit.html` shows the badge and "Liên hệ" on the SV465 Thùng (`SV465-4L- T80`) and Dây 8 (`SV465-4L- G8`) rows; `store-product.html` / `store-listing.html` show those units as "Liên hệ" with no note. The 175x120 napkin is shown with its printed prices and no badge (owner decision D1, 2026-10-30) |
| C3 | `docs/wireframes/store-product.html:58`, `docs/design-guidelines.md:119` | Mobile product page repeats unit chips in "Tất cả quy cách" | Hide that table below 960px; keep on desktop |
| C4 | header "Kiểm tra đơn" (store-*.html:25), dock "Theo dõi đơn" (store-home:206, store-listing:207, store-quote:109), `design-guidelines.md:72,82,125,126` | Three labels for one feature | "Tra cứu đơn" everywhere (matches `feature-spec.md:31,35`) |
| C5 | `docs/feature-spec.md:58` | B3 says "một trang (không phải popup)"; wireframe + owner decision C (2026-10-29) = large KiotViet modal | Rewrite B3: modal, tabs Thông tin / Mô tả / SEO, "Quy cách & giá" card |
| C6 | `docs/feature-spec.md:93` | B8 lists "mốc miễn phí giao"; dropped in `requirements-decisions.md:7` | Remove; ladder = (mốc, % giảm) only, empty = off |
| C7 | `docs/design-guidelines.md:118` | "không bao giờ hiện 0%", no badge when equal; decision = "Bằng giá mua lẻ" | Rule: > 0 -> "Tiết kiệm x,x%"; rounds to 0,0 -> "Bằng giá mua lẻ"; negative -> nothing (open Q3) |
| C8 | `store-checkout.html` ("Nội dung DH00045"), `admin-quotes.html` | Sequential DH/BG codes, and transfer content shown before an order code exists | Codes `DNA7K2M9Q` / `BG4H8T2X` style; bank + QR move to a new confirmation page (`admin-dashboard.html` not edited: deferred, C13) |
| C9 | `docs/design-guidelines.md:148` | "ảnh WebP"; locked pipeline is Thumbnailator JPEG/PNG (ImageIO has no WebP writer) | Say "JPEG (PNG nếu có nền trong suốt), 3 cỡ, khai báo kích thước" |
| C10 | `docs/design-guidelines.md:86` "Không lấy ... nhãn Sale đỏ và giá gạch" vs A20 | Promo display | Keep "không lấy" for countdown/promo blocks; A20 strikethrough + "Sale" badge only while a promo is active |
| C11 | `docs/wireframes/admin-import.html` step 1 option radios | Import options matrix dropped [RT#10] | Replace radios with a read-only "Quy tắc nhập" box: mã đã có -> cập nhật; mã mới -> "Cần bổ sung" (ẩn); ngừng kinh doanh -> ẩn; lệch giá nhập tay -> hỏi từng dòng |
| C12 | `store-checkout.html` / new `store-order.html` | Order page reached by link token [RT#5] | Order page opens after submit and via "Tra cứu đơn" (mã đơn + SĐT); no `?t=` link |
| C13 | `docs/wireframes/index.html:39`, `admin-dashboard.html`, `docs/design-guidelines.md:33`, `docs/feature-spec.md:96-98` (B9) | Owner decision A (2026-10-29): admin dashboard "Tổng quan" and audit-log viewer cut | `index.html` row "Tổng quan" -> note "Hoãn, không làm ở giai đoạn 1; admin mở vào Hàng hóa; mục menu Tổng quan trên các wireframe admin không làm"; one-line "Hoãn" banner at the top of `admin-dashboard.html` (no other edits); design-guidelines menu = 5 items without Tổng quan; B9: nhật ký vẫn ghi (lịch sử giá trong form sản phẩm, lịch sử đơn), không có màn xem nhật ký; màn Người dùng hoãn (owner decision D2, 2026-10-30): giai đoạn 1 chỉ có tài khoản MANAGER tạo lúc khởi động, vai trò EDITOR giữ trong hệ thống, khôi phục/tạo/khoá tài khoản theo quy trình kỹ thuật (phase 8) |
| C14 | `docs/feature-spec.md:41` (A21), `:81` (B6), `admin-quotes.html:125`, `store-quote.html`, `store-checkout.html` | Owner decision B (2026-10-29): no "mua thêm X để giảm Y%" bar; one discount figure per order | A21: bậc ưu đãi áp tự động sau giá KM, không có thanh tiến độ; B6: lưu một khoản `discount_total` + ghi chú ngắn, giảm KM thấy theo từng dòng; `admin-quotes.html` totals label "Giảm đã áp" (+ ghi chú); confirm `store-quote.html` / `store-checkout.html` show no progress bar |
| C15 | `docs/feature-spec.md:117` (D "cổng thanh toán online"), `:30` (A10) | Owner decisions W1/W2 (Validation S2): SePay bank-notification webhook + auto-PAID on exact match | D: add "(không gồm webhook báo biến động số dư từ dịch vụ thông báo như SePay; tiền vẫn vào thẳng tài khoản công ty)"; A10: QR động (số tiền + nội dung) chỉ hiện sau khi nhân viên xác nhận tổng tiền; trước đó chỉ số tài khoản + nội dung; đơn tự chuyển "Đã nhận tiền" khi giao dịch khớp chính xác, còn lại vào hàng chờ đối soát |

<!-- Updated: Validation Session 1 - C2 per-SKU needs_confirmation flag, flagged SKUs shown as "Liên hệ" -->
<!-- Updated: Validation Session 3 - C2 napkin priced (D1); C13 users screen deferred (D2) -->

Note: `feature-spec.md:35` (A15) already says "lưới 2 cột" and "Tra cứu đơn"; only confirm, no edit needed.

## Architecture

N/A (documentation). Single source after this phase: `feature-spec.md` (what), `design-guidelines.md` (look), `plan.md` (how).

## Related Code Files

Modify:
- `D:\dna-web\docs\feature-spec.md` (A10, A21, B3, B6, B8, B9, C data model incl. `bank_transaction`, D wording (C15), new A9b confirmation/QR page, decisions section, mark answered questions, E roadmap -> link to plan)
- `D:\dna-web\docs\requirements-decisions.md` (append decisions: saving label, ladder, promo, KiotViet ownership split, order code; [RT#6] email notification required at go-live, bank settings MANAGER-only, manual "Đã nhận tiền" MANAGER-only (RT#6 amended by W2: PAID may also be set by the authenticated exact-match webhook); [RT#13] storefront prices may lag up to ~60 s, order repriced on submit; owner decisions A-C already appended 2026-10-29, only cross-check; append Validation Session 1: mismatch 2% both directions, single MANAGER account, print-to-PDF via browser, KiotViet rename = SKU name only, SV465 Thùng/Dây 8 "Liên hệ" until packing confirmed; append Validation Session 2: W1 SePay notifier + own EMVCo QR (Casso fallback, payOS rejected), W2 auto-PAID on exact match else review queue, QR only after staff confirm the total; append Validation Session 3 and amend decision A line (`requirements-decisions.md:24`, minimal users screen): D1 175x120 napkin priced, D2 users screen deferred, account changes via runbook)
- `D:\dna-web\docs\tech-stack.md` (pin versions from plan.md decisions table; Java 21)
- `D:\dna-web\docs\design-guidelines.md` (C1-C4, C7, C9, C10, C13 menu)
- `D:\dna-web\docs\wireframes\store-home.html`, `store-listing.html`, `store-product.html`, `store-quote.html`, `store-checkout.html`, `admin-product-edit.html`, `admin-quotes.html` (C8, C14), `admin-dashboard.html` ("Hoãn" banner only, C13), `admin-import.html` (C11), `index.html` (C13 deferred note, store-order link)
- `D:\dna-web\docs\wireframes\assets\storefront.css` (`.qrows` at line 271 and its "Tất cả quy cách" label: hidden by default, shown inside the `@media (min-width:960px)` block at line 319; give the label a class, e.g. `.lbl-all`)

Create:
- `D:\dna-web\docs\wireframes\store-order.html` (order confirmation / lookup result: code, status steps, totals, bank block, "Nhân viên xác nhận tồn kho, phí giao và tổng tiền"; two states: "Chờ xác nhận" = account number + transfer content as text, no QR; "Đã xác nhận" = QR placeholder with amount + content; plus a "Đã nhận tiền" state [V2, W1])

<!-- Updated: Validation Session 2 - C15 spec D/A10 wording, store-order QR states, requirements-decisions S2 append -->


Delete:
- `D:\dna-web\docs\wireframes-v1-pdf-style\` (whole folder)

## Implementation Steps

1. Apply C1-C15 edits in the files listed; keep copy short (design-guidelines s.2.3).
2. Product page JS in `store-product.html`: render "Bằng giá mua lẻ" when pct rounds to 0,0 and unit is not base; hide badge when negative.
3. Checkout wireframe: replace bank block with one line "Mã đơn và mã QR chuyển khoản hiển thị sau khi đặt hàng"; add `store-order.html` and link it from `index.html`.
4. feature-spec C section: add `sku.price_visible`, `sku.needs_confirmation` [V4], `sku.code_key`, `slug_history`, `import_batch`, `app_setting`, `discount_tier`, `contact_message`; drop free-ship threshold.
5. Delete `docs/wireframes-v1-pdf-style/`; grep docs for links to it and remove.
6. Re-take affected screenshots in `docs/wireframes/screenshots/` (store-home, store-listing, store-product mobile, store-checkout, admin-product-edit).

## Tests

- Grep checks: no hits for `Giao toàn quốc|Theo dõi đơn|Kiểm tra đơn|DH000|BG000|wireframes-v1|[Mm]ua thêm` under `docs/` (excluding `reference-site-analysis.md`, which describes the reference site, and the deferred `wireframes/admin-dashboard.html`).
- Open each changed wireframe at 390px and 1440px: no horizontal scroll (`scrollWidth == clientWidth`).

## Success Criteria

- [ ] C1-C15 resolved; grep checks above return zero hits.
- [ ] `feature-spec.md` A10/A21/B3/B6/B8/B9/C/D and the new confirmation page match plan.md decisions (incl. owner decisions A-C, W1, W2, D1, D2).
- [ ] `index.html` marks `admin-dashboard.html` as deferred (not built in phase 1 scope).
- [ ] `docs/wireframes-v1-pdf-style/` gone; no dangling links.
- [ ] Owner skims the diff and confirms (15 min review).

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| Owner later re-asks for "Giao toàn quốc" | M x L | One-line copy change in settings trust strip (phase 7 makes it editable) |
| Screenshots drift from HTML | M x L | Re-take only the 5 affected screens |

Rollback: `git revert` of the docs commit; the deleted v1 folder is recoverable from history only if committed first, so commit the current docs as a baseline before deleting.
