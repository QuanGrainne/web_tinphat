---
phase: 7
title: "Content and settings"
status: pending
priority: P2
effort: "1.0-1.25 pw (estimate; was 1.25-1.5: minimal users screen + API deferred by owner decision D2 2026-10-30, -0.25 (5 endpoints, service, table + 2 dialogs, `UserAdminIT`: ~1-1.5 person-days); earlier 2.25-2.75 before dashboard, audit-log viewer, user role editing and the tier progress bar were cut by owner decisions A/B 2026-10-29; keeps +0.25 for bank re-auth/alert and URL validation)"
dependencies: [5, 6]
---

# Phase 7: Content and settings

## Overview

Spec A1 (configurable home blocks), A12, A13, A21 (ladder applied server-side only, no basket progress bar [decision B]), B7, B8, B9 (no audit-log viewer [decision A]; users screen deferred [D2]). Promo price already shipped in phase 3. Makes the seeded settings (company, bank, threshold, tiers, owner email) editable so go-live does not need SQL.

Out of scope (owner decision A, 2026-10-29): admin dashboard "Tổng quan" (`docs/wireframes/admin-dashboard.html` marked deferred in phase 1) and the audit-log viewer screen. `audit_log` rows are still written everywhere (phase 2 onward); price history stays in the product editor (phase 3) and the order "Lịch sử" tab stays (phase 6). Admin landing page = product list (`/admin` -> `/admin/products`, set in phase 3); "what is new" = header bell counter + requests list (phase 6).

Out of scope (owner decision D2, 2026-10-30): user management screen and `/api/admin/users` API (list, create, password reset, disable/re-enable, login-delay clear). See Requirements "Accounts".

## Requirements

- News: 4 categories (names: open Q11), list, category list, article page with related posts (3, same category) and product blocks with live prices; SEO per post; draft/publish.
- Block editor (antd `Form.List`): HEADING (h2/h3), PARAGRAPH (Markdown, HTML disabled), IMAGE (image + caption), TABLE (header + rows), FAQ (q/a pairs), PRODUCTS (<= 4 products, rendered as live cards through `PublicPriceRedactor` [RT#4]). Same renderer for posts and static pages.
- Static pages: Giới thiệu, Liên hệ (contact form from phase 6 + map embed URL from settings), Chính sách đổi trả / vận chuyển / thanh toán / bảo mật, Đại lý & Mua sỉ (nav button target). Seeded as drafts; owner writes copy.
- Home config: banner slides (title, line, button, link, optional desktop + mobile images; no image = flat blue banner per design), trust strip, category grid, brand grid, product rows (by category or brand, 5 cards, redacted prices [RT#4]), news row; reorder + enable/disable.
- Settings (MANAGER): company info, Zalo number, social links, map embed URL, owner notification email, bank (name, BIN 6 digits, account no, account name), trust strip (max 3 items), price-mismatch threshold % (default 2, range 0-50), discount ladder table (threshold VND, % off; empty = off, labelled "Đang tắt"), delivery terms text. No free-shipping threshold (decision).
- Bank settings [RT#6]: bank fields **and** `notify.ownerEmail` (so alerts cannot be silenced first; owner-email password re-entry decided: owner-confirmed [V5]) are saved only through the protected endpoint: re-enter the MANAGER's password (`currentPassword` checked with the password encoder; wrong -> 403 `REAUTH_FAILED`); every change emails the owner (old and new `notify.ownerEmail` when it changed) with old/new account (masked) and who changed it, via the phase-6 `NotificationPort`.
- Receiving account vs SePay [W1]: the bank dialog states that changing the receiving account also requires (1) linking the new account in SePay, (2) updating `DNA_SEPAY_ACCOUNT_NO` (env, redeploy) and (3) a test QR scan; until settings, env and SePay agree, the phase-6 matcher sends every transfer to REVIEW (no auto-PAID) and the settings page shows a warning "Tài khoản nhận tiền chưa khớp cấu hình SePay" (`GET /api/admin/settings/payment` returns `webhookAccountMatches`). The alert email repeats this checklist.
- URL fields [RT#7]: every admin-authored URL (banner link, button URL, social links, map embed, PRODUCTS/markdown links) is validated server-side by `UrlFieldValidator`: `https://` absolute or site-relative (`/path`, not `//`); `javascript:`, `data:`, `http:` and anything else rejected with `VALIDATION_FAILED`. Map embed: host allow-list `www.google.com` with path prefix `/maps/embed` (also `maps.google.com`). Nonce-based CSP is deferred (future; phase 8 note).
- A21 [decision B]: when tiers exist the phase-6 `OrderPricingService` applies the ladder after promo prices and the basket/order shows the result as one "Giảm đã áp" line (`discountTotal` + `discountNote`); no "Mua thêm X để giảm Y%" bar, no next-tier API field. Nothing to build here beyond the settings table.
- Accounts [V3, D2]: no users screen or API in phase 1. The only account is the bootstrap MANAGER created from env on first start (phase 2); the EDITOR role stays in the model, role matrix and `@PreAuthorize` rules, but no EDITOR user is created. Create / disable / re-enable / password reset / role change are done by the developer with SQL per the phase-8 account recovery runbook; phase-2 `SessionValidityFilter` honours those DB changes on the user's next request [RT#3] (covered by phase-2 `SessionValidityIT`).

<!-- Updated: Validation Session 1 - single MANAGER at launch; owner-email re-auth confirmed -->
<!-- Updated: Validation Session 3 - D2: users screen + API deferred; accounts via SQL runbook -->

## Architecture

- Package `content`: `Post`, `PostCategory`, `Page`, `HomeSection`, `ContentBlock` (sealed interface + records, Jackson `@JsonTypeInfo(property="type")`), `BlockValidator` (uses `UrlFieldValidator`). Blocks stored as `jsonb`.
- Freshness [RT#13]: public content fetches use the phase-5 `revalidate: 60`; no tags or invalidation calls. Settings, home and posts show changes within ~60 s.
- Public API: `GET /api/public/home` (now from `home_section`), `/api/public/posts`, `/api/public/posts/{slug}`, `/api/public/post-categories/{slug}`, `/api/public/pages/{slug}`; history slugs -> REDIRECT as in phase 5. Sitemap adds posts and pages. All new routes registered in `PublicRouteSamples` (phase-5 `PublicPriceLeakIT`) [RT#4].
- Settings stay in `app_setting` (jsonb per key) behind typed `SettingsService` records; tiers key `discount.tiers` = `[{threshold, pct}]`, validated ascending, unique, `0 < pct <= 50`. Bank keys and `notify.ownerEmail` saved only through `PUT /api/admin/settings/payment {bank..., ownerEmail, currentPassword}` [RT#6].
- `common/validation/UrlFieldValidator` (pure) used by settings and content services [RT#7].
- Storefront static pages: `app/(storefront)/[slug]/page.tsx` at the group root (static segments like `danh-muc` take precedence); unknown slug -> 404.

### Data (Flyway V50-V52)

- `V50__content.sql`: `post_category(id, name, slug unique, sort_order)` (4 seeded placeholders), `post(id, category_id, title, slug unique, excerpt, cover_image_id, blocks jsonb, seo_title, seo_description, status DRAFT|PUBLISHED, published_at, version, ...)`, `page(id, title, slug unique, blocks jsonb, seo_title, seo_description, status, version, ...)` + 7 draft pages.
- `V51__home_section.sql`: `home_section(id, kind BANNER|TRUST_STRIP|CATEGORY_GRID|BRAND_GRID|PRODUCT_ROW|NEWS, title, config jsonb, sort_order, enabled, version)` seeded to reproduce the phase-5 fixed home.
- `V52__settings_keys.sql`: new keys (Zalo, social, map URL, delivery terms) with defaults.

## Related Code Files

Create (api `D:\dna-web\apps\api\src\main\java\vn\dnahoangnguyen\api\`): `content\Post.java`, `PostCategory.java`, `Page.java`, `HomeSection.java`, `ContentBlock.java`, `BlockValidator.java`, `PostRepository.java`, `PageRepository.java`, `HomeSectionRepository.java`, `ContentService.java`, `ContentAdminController.java`, `ContentPublicController.java`, `ContentDtos.java`; `common\validation\UrlFieldValidator.java` [RT#7]; `settings\SettingsAdminController.java`, `settings\SettingsDtos.java`; resources `db\migration\V50__content.sql`, `V51__home_section.sql`, `V52__settings_keys.sql`
Modify (api): `settings\SettingsService.java` (writes + validation + audit), `sales\notify\NotificationPort.java` + `EmailNotificationAdapter.java` (`bankSettingsChanged`) [RT#6], `storefront\StorefrontController.java` (home from sections; sitemap adds posts/pages), `storefront\PublicRouteSamples.java` (new public routes) [RT#4], `common\error\ProblemCode.java` (`REAUTH_FAILED`)

Create (web `D:\dna-web\apps\web\`): `app\(storefront)\tin-tuc\page.tsx`, `app\(storefront)\tin-tuc\chuyen-muc\[slug]\page.tsx`, `app\(storefront)\tin-tuc\[slug]\page.tsx`, `app\(storefront)\[slug]\page.tsx`, `components\storefront\content-blocks.tsx`, `home-sections.tsx`, `post-card.tsx`; `app\(admin)\admin\content\posts\page.tsx`, `app\(admin)\admin\content\pages\page.tsx`, `app\(admin)\admin\content\home\page.tsx`, `app\(admin)\admin\settings\page.tsx`, `components\admin\content\block-editor.tsx`, `post-editor-modal.tsx`, `page-editor-modal.tsx`, `home-section-list.tsx`, `components\admin\settings\settings-row.tsx`, `discount-tier-table.tsx`, `bank-settings-dialog.tsx` (password re-entry) [RT#6], `lib\admin\content-api.ts`, `lib\admin\settings-api.ts`, `e2e\content-publish.spec.ts`, `e2e\settings-bank-qr.spec.ts`
Modify (web): `app\(storefront)\page.tsx` (render `home-sections`), `app\sitemap.ts`, `components\storefront\site-nav.tsx` ("Đại lý & Mua sỉ" -> `/dai-ly-mua-si`), `components\admin\admin-shell.tsx` (Nội dung and Cài đặt submenus; no Người dùng item [D2])

Not touched here (was in the earlier draft): `app\(admin)\admin\page.tsx` (landing redirect owned by phase 3), `app\(storefront)\gio-hang\page.tsx`, `sales\pricing\OrderPricingService.java` (no `nextTier`); deferred [D2]: `admin\user\UserAdminController.java`, `UserAdminService.java`, `app\(admin)\admin\settings\users\page.tsx`, `components\admin\users\*`.

## Implementation Steps

1. Settings write API + screen first (unblocks go-live config: bank, company, threshold, owner email, ladder); `UrlFieldValidator`; bank endpoint with re-auth + email alert.
2. Content model, `BlockValidator`, admin editors, public endpoints, storefront pages, sitemap; register routes in `PublicRouteSamples`.
3. Home sections (seed = current fixed home, so the page does not change until edited).
4. Playwright specs (local).

## Tests

- `BlockValidatorTest`: unknown `type` rejected; table row length != header length rejected; PRODUCTS with 5 ids rejected; empty heading rejected; markdown link `javascript:alert(1)` rejected.
- `UrlFieldValidatorTest` [RT#7]: accepts `https://zalo.me/0366985679`, `/danh-muc/giay`, map `https://www.google.com/maps/embed?pb=...`; rejects `javascript:alert(1)`, `JaVaScRiPt:...`, `data:text/html,...`, `http://example.com`, `//evil.com`, map embed on `evil.com`, `https://www.google.com.evil.com/maps/embed`.
- `ContentServiceIT`: publish sets `published_at`; draft absent from public API; slug rename -> REDIRECT; PRODUCTS block skips unpublished products at render time; banner link `javascript:` -> 400.
- `HomeSectionServiceIT`: reorder + disable reflected in `/api/public/home`; seeded order equals phase-5 layout.
- `SettingsAdminIT`: EDITOR (test user inserted via repository) -> 403; tiers not ascending / duplicate / pct 0 or 60 -> 400; empty tiers accepted (= off); a saved tier is applied by the next `POST /api/public/cart/price` (`discountTotal` > 0, phase-6 pricing); threshold 2.0 -> 3.5 changes phase-3 warning output; BIN must be 6 digits; every save writes `audit_log SETTINGS_CHANGE`; bank save without or with wrong `currentPassword` -> 403 `REAUTH_FAILED`, nothing saved; correct password -> saved + one alert mail (GreenMail) [RT#6]; account changed while `DNA_SEPAY_ACCOUNT_NO` holds the old one -> `webhookAccountMatches=false` [W1].
- Session eviction on disable / role change / password change made directly in the DB stays covered by phase-2 `SessionValidityIT` [RT#3]; nothing added here [D2].
- `PublicPriceLeakIT` additions [RT#4]: home with a PRODUCT_ROW and a post with a PRODUCTS block containing the hidden-price SKU.
- Web Vitest: `content-blocks.test.tsx` (`<script>` in Markdown rendered as text; table and FAQ markup).
- Playwright (local): `content-publish.spec.ts` (post with product block visible on `/tin-tuc/...`; product price edit shows in the block within ~60 s); `settings-bank-qr.spec.ts` (bank change with password -> new account number appears in order-page QR text).

## Success Criteria

- [ ] Owner edits company, bank, trust strip, threshold and home blocks without SQL; storefront reflects changes within ~60 s.
- [ ] Bank change requires password and the owner receives the alert email [RT#6].
- [ ] No admin URL field accepts a non-https / script URL (`UrlFieldValidatorTest`) [RT#7].
- [ ] Static pages and one news article published with real copy from owner.
- [ ] Tiers empty -> no discount and no "Giảm đã áp" amount; adding a tier applies server-side and appears as one "Giảm đã áp" line in basket, order page and admin totals (no progress bar) [decision B].
- [ ] No dashboard, audit-log viewer or users route exists (`/admin/settings/users`, `/api/admin/users` absent); `/admin` opens the product list [decisions A, D2].

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| Block editor grows into a page builder | M x M | Six block types only; no layout/columns/colours |
| Owner content (policies, about) not ready at go-live | H x M | Seeded drafts; owner deliverables table in plan.md; go-live checklist (phase 8) lists required pages |
| Wrong or malicious bank settings -> customers pay wrong account [RT#6] | L x H | MANAGER only, password re-entry, email alert to owner, audit log, QR test in phase 8 checklist after every bank change; webhook auto-PAID stops (REVIEW only) until settings, env and SePay match [W1] |
| Stored script URL in banner/social link [RT#7] | L x H | Server-side `UrlFieldValidator`; Markdown `html:false`; CSP (phase 8); nonce CSP deferred |
| Tier semantics disputed later (stacking with promo) | M x L | Ships empty; applied after promo (Q4 default); single `discount_total` + note keeps a later change to one function |
| Owner later wants dashboard / audit viewer back [decision A] | M x L | `audit_log` and request data already stored; wireframe kept as deferred; both are read-only screens addable in a later release without migrations |
| No users screen: every account change needs the developer and server access [D2] | M x M | Owner decision; SQL runbook in `docs/deployment-guide.md` (phase 8) with the documented hash command; phase-2 tables already hold `enabled`, `role`, `password_changed_at`, so the screen can ship later without migrations |
| Single MANAGER account; owner locked out or forgets password [V3] | L x H | **Owner accepted risk: single account, recovery needs server access.** Recovery runbook (phase 8); with no users screen nobody can disable the last MANAGER from the UI |

<!-- Updated: Validation Session 1 - single-account accepted risk -->
<!-- Updated: Validation Session 2 - bank settings note: receiving-account change also needs SePay + env update (W1); effort unchanged -->
<!-- Updated: Validation Session 3 - D2 users screen deferred; effort 1.25-1.5 -> 1.0-1.25; file renamed from phase-07-content-settings-and-users.md -->

Rollback: V50-V52 additive; home sections seeded to the existing layout, so disabling the feature = reverting the home page commit. Account changes stay SQL-only (phase 8 runbook).
