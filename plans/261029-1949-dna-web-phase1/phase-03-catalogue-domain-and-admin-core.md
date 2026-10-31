---
phase: 3
title: "Catalogue domain and admin core"
status: pending
priority: P1
effort: "3.5-4.5 pw (estimate; largest hand-built admin surface; +0.5 for the hand-built catalogue seed)"
dependencies: [1, 2]
---

# Phase 3: Catalogue domain and admin core

## Overview

Spec B1, B2, B3 (+ promo part of A20 and B3). Data model for category (2 levels + attribute sets), brand, product, SKU/unit, price history, images, slugs + redirects; pure pricing rules reused by phases 5-6; KiotViet-style admin list, modal editor, category tree, brands; one-off catalogue seed of all 69 codes [RT#14]. Ends with: the 32 products / 69 SKUs from the printed catalogue exist as drafts; owner edits "Giấy rút đáy Sen Vàng" (Gói/Thùng 6G/Thùng 10G), sees "Đơn giá/gói", a mismatch warning when a pack price is off, and price history.

Boundary change vs brief: promo price (per-SKU price + from/to dates) moved here from phase 7, because storefront (5) and order pricing (6) must use the effective price from day one. Phase 7 keeps the discount ladder.

## Requirements

- B1: tree max 2 levels, drag-drop order, name/slug/image/description/SEO/visible; level-1 has attribute set (e.g. giấy: số tờ, số lớp; pin: cỡ, điện áp), level-2 inherits it; delete blocked when products exist, offer "Chuyển sản phẩm rồi xoá"; slug change -> redirect.
- B2: name/logo/banner/description/SEO/order/visible; quick-create from product modal; merge duplicates; delete blocked when products exist (spec wins over the wireframe dialog that deletes with N codes, see Risk).
- B3: list with filter column (Nhóm hàng, Thương hiệu, Hiển thị trên web, Cần bổ sung, Nguồn giá, Trạng thái, Cập nhật giá), bulk change category / show / hide, expandable row (Thông tin / Mô tả / Lịch sử giá); modal tabs Thông tin / Mô tả / SEO; "Quy cách & giá" table (Đơn vị, Quy đổi, Mã hàng, Giá đã gồm VAT, Đơn giá/gói auto, Giá KM + từ/đến, Nguồn, Hiển thị giá Hiện giá/Liên hệ, Hiện/ẩn); duplicate; draft/publish; discontinue instead of delete; price history; admin-only per-SKU `needs_confirmation` badge "Cần xác nhận quy cách" (list shows it when any SKU is flagged; MANAGER clears it) + product internal note; never shown to customers [V4].
- Publish requires: a category and >= 1 visible SKU with a price. No image -> publish allowed, storefront shows a neutral placeholder, admin shows warning "Chưa có ảnh" and the product stays under "Cần bổ sung" [RT#15].
- Catalogue seed [RT#14]: `apps/api/src/main/resources/seed/catalogue-2026.csv` built by hand from `docs/catalogue-text.txt`; 69 codes / 32 products, codes kept **exactly** as printed (including odd ones such as `SV465-4L- Gói`, `SVRĐ1280t 6G`, `SV12C1.4Kg 4L(SV1412) G`); loaded by `CatalogueSeedLoader`. Launch no longer depends on the owner's KiotViet export.
- Unconfirmed packing [V4, D1]: the catalogue marks only SV465 Thùng and Dây 8 "* Quy cách đóng gói cần xác nhận" (`docs/catalogue-text.txt:105-111`, note `:499`). These 2 SKUs (`SV465-4L- T80`, `SV465-4L- G8`) are seeded with `price_visible=false` (storefront "Liên hệ", quote only) and `needs_confirmation=true` (admin badge) until the owner confirms; the base `SV465-4L- Gói` stays priced. The 175x120 napkin (`SV300-3L-Gói` 3.229đ, `SP000014` 32.290đ, `:175-184`) is seeded priced and unflagged (owner decision D1, 2026-10-30): the catalogue note `:500` concerns only the size unit, not packing or price; the owner corrects it in the editor if wrong.

<!-- Updated: Validation Session 1 - per-SKU needs_confirmation flag -->
<!-- Updated: Validation Session 3 - D1: only the 2 SV465 packing SKUs hidden-price + flagged; napkin priced -->

- Role rules from phase 2 matrix (EDITOR cannot change price/promo/conversion/code/price-visibility, publish, delete, merge).

## Architecture

### Data (Flyway V10-V13)

- `V10__media.sql`: `image(id, sha256 char(64) unique, mime, width, height, bytes, has_alpha, original_name, created_by, created_at)`.
- `V11__catalogue.sql`:
  - `category(id, parent_id null fk, name, slug unique, image_id, description, seo_title, seo_description, sort_order, visible, version, created_*/updated_*)`; depth <= 2 checked in service.
  - `category_attribute(id, category_id fk, code, label, kind TEXT|NUMBER|OPTION, options jsonb, unit, filterable, sort_order, unique(category_id, code))`.
  - `brand(id, name, slug unique, logo_image_id, banner_image_id, description, seo_title, seo_description, sort_order, visible, version, ...)`.
  - `product(id, name, slug unique, brand_id, category_id, description_md, attributes jsonb default '{}', seo_title, seo_description, published bool, first_published_at, status ACTIVE|DISCONTINUED, auto_discontinued bool default false [RT#10], internal_note, search_text, version, ...)`.
  - `product_image(product_id, image_id, sort_order, pk(product_id, image_id))`.
  - `sku(id, product_id fk, code varchar(80), code_key varchar(80) unique, name, unit_name, conversion int check (conversion > 0), is_base bool, price bigint null check (price >= 0), price_visible bool default true, needs_confirmation bool default false [V4], promo_price bigint null, promo_from date, promo_to date, source MANUAL|KIOTVIET, kiotviet_price bigint, kiotviet_price_ack bigint, kiotviet_active bool, kiotviet_group, last_synced_at, visible bool, auto_hidden bool default false, needs_review bool default false [RT#10], sort_order, version, ...)`; `create unique index ux_sku_one_base on sku(product_id) where is_base`.
- `V12__price_history.sql` [RT#12: FK moved here from phase 4]: `import_batch(id, file_name, file_sha256, status PREVIEW|APPLIED|CANCELLED, summary jsonb, rows jsonb, error_count, created_by, created_at, applied_by, applied_at)` (table only; used by phase 4) and `price_history(id, sku_id, field PRICE|PROMO, old_price, new_price, promo_from, promo_to, source MANUAL|EXCEL|SEED, import_batch_id bigint null references import_batch(id), changed_by, changed_at)`.
- `V13__slug_history.sql`: `slug_history(id, entity_type PRODUCT|CATEGORY|BRAND|POST|PAGE, old_slug, entity_id, created_at, unique(entity_type, old_slug))`.

"Cần bổ sung" is computed, not stored: `no image || (!published && (no category || no priced visible SKU)) || any sku.needs_review || any sku.needs_confirmation` [RT#10, RT#15, V4].

### Catalogue seed [RT#14]

- CSV columns: `product_key, product_name, brand, category_l1, category_l2, code, sku_name, unit_name, conversion, is_base, price, price_visible, needs_confirmation`. UTF-8, one row per SKU, codes copied verbatim from `docs/catalogue-text.txt`; the last two columns are `false`/`true` only on the 2 SV465 packing SKUs [V4, D1] (price still loaded, so the owner only flips "Hiện giá" after confirming).
- `catalog/seed/CatalogueSeedLoader` (`ApplicationRunner`, enabled by `dna.seed.catalogue.enabled`; `true` in dev, set once in prod for the first start then removed): one transaction; creates missing categories/brands by name; for each `product_key` creates a DRAFT product through `ProductService.saveAggregate(..., ChangeSource.SEED)`; skips any SKU whose `code_key` exists (idempotent: second run writes nothing); records `app_setting seed.catalogue.appliedAt`. Prices land with `source=MANUAL`, so the first KiotViet import shows real differences as "Lệch giá" (phase 4).
- Replaces the earlier 3-product `db/dev/R__dev_seed.sql` (dropped; dev uses the full seed).

### Pure rules (no Spring; `catalog/pricing/PriceRules.java`, money = `long` VND)

- `effectivePrice(sku, LocalDate today)`: promo when `promo_price != null` and `promo_from <= today <= promo_to` (nulls = open, dates inclusive, zone `Asia/Ho_Chi_Minh`), else `price`. Evaluated at read time on every request; nothing is scheduled at promo boundaries [RT#13]. Validation: `promo_price < price`, `promo_from <= promo_to`.
- `perBaseUnit(price, conversion) = round(price / conversion, HALF_UP)`.
- `saving(baseEff, conversion, packEff)` -> `Saving{kind, pct}`: pct = `(baseEff*conv - packEff) / (baseEff*conv) * 100`, 1 decimal HALF_UP. `PERCENT` if pct >= 0.1; `EQUAL` ("Bằng giá mua lẻ") if pct rounds to 0.0; `NONE` if negative, base unit, or base price missing/zero (open Q3).
- `packDeviation(basePrice, conversion, packPrice)` = `(packPrice - basePrice*conv) / (basePrice*conv) * 100`; **mismatch when `|dev| > threshold`**, threshold from `SettingsService.mismatchThresholdPct()` (configurable, default 2%, both directions: owner-confirmed [V1], `docs/design-guidelines.md:53`). Warning only, never blocks save.

<!-- Updated: Validation Session 1 - mismatch threshold 2% both directions confirmed; seed CSV flag columns -->

- `KIOTVIET_PRICE_DIFF` warning: `source == MANUAL && kiotviet_price != null && kiotviet_price != price && kiotviet_price != kiotviet_price_ack`. Actions: "Dùng giá KiotViet" (price = kiotviet_price, source = KIOTVIET) or "Giữ giá nhập tay" (ack = kiotviet_price).

### Code key and text folding (shared with phase 4 and search)

- `SkuCodeKey.of(raw)`: NFC; NBSP/U+2007/U+202F/tab/CR/LF -> space; drop zero-width U+200B-U+200D, U+FEFF; Unicode dashes U+2010-U+2015, U+2212 -> `-`; trim; collapse space runs to one; `toUpperCase(Locale.ROOT)`. Keeps inner single spaces, `Đ`, dots, parentheses. Raw `code` is stored and displayed verbatim (design-guidelines s.3). No secondary near-duplicate key [RT#10: dropped].
- `TextFold.fold(s)`: NFD strip U+0300-U+036F, `đ/Đ`->`d`, lowercase, collapse spaces. Drives `product.search_text` (name + brand + SKU codes + SKU names), maintained on save.

### Slugs (`catalog/slug/SlugUtil`, `SlugService`)

`đ/Đ`->`d`, NFD strip marks, lowercase, `[^a-z0-9]+`->`-`, trim `-`, max 80 chars cut at a hyphen, empty -> entity fallback (`san-pham`). Generated once at create; unique per table with `-2`, `-3` suffix. Manual edit writes old slug to `slug_history`. A new entity claiming a historic slug deletes that history row (live slug wins).

### Services and API (`/api/admin/...`, problem codes added: `CATEGORY_NOT_EMPTY`, `BRAND_NOT_EMPTY`, `PUBLISH_REQUIREMENTS_UNMET`, `FORBIDDEN_FIELD`)

- Categories: `GET /categories` (tree + product counts), `POST`, `PUT /{id}`, `PUT /categories/order`, `PUT /{id}/attributes`, `POST /{id}/move-products`, `DELETE /{id}`.
- Brands: `GET`, `POST`, `PUT /{id}`, `POST /{id}/merge {targetId}`, `DELETE /{id}`.
- Products: `GET /products` (filters + totals row: products, SKUs, visible), `GET /{id}` (aggregate + warnings + last 50 price changes), `POST`, `PUT /{id}` (whole aggregate incl. SKUs with versions), `POST /{id}/publish|unpublish|discontinue|reactivate|duplicate`, `POST /products/bulk {ids, action SET_CATEGORY|PUBLISH|UNPUBLISH}`, `POST /products/merge {sourceIds, targetId}` (moves SKUs, source slugs -> history pointing at target; used to group imported codes), `POST /skus/{id}/kiotviet-diff {choice}`, `POST /skus/{id}/reviewed` (clears `needs_review`); `needs_confirmation` is cleared through `saveAggregate` (MANAGER-only field, like `price_visible`) [V4].
- **Single write path [RT#10]:** `ProductService.saveAggregate(command, actor, ChangeSource MANUAL|EXCEL(batchId)|SEED)` is the only method that writes products/SKUs. It role-guards fields (MANUAL only), recomputes `search_text`, writes `price_history` (with `source` and `import_batch_id`) and `audit_log` (`PRICE_CHANGE`, `CONVERSION_CHANGE`, `PUBLISH`, `DISCONTINUE`, `MERGE`, `DELETE`) in the caller's transaction. The editor, the seed loader (here) and import apply (phase 4) all call it.
- No change events or cache invalidation calls: the storefront re-reads within 60 s (phase 5) [RT#13].
- Images: `POST /images` multipart -> `{id, urls}`.

### Images (`media`)

Max 5 MB (multipart limit), magic bytes JPEG `FF D8 FF` / PNG `89 50 4E 47` only, read dimensions via `ImageReader` from the header before any decode and reject `width x height > 16 MP` (~4000x4000) [RT#8], sha256 dedup, Thumbnailator widths 300/600/1200 (no upscale), JPEG q0.85 or PNG when alpha, re-encode strips EXIF. Decode + resize runs behind a single-permit `Semaphore` in `ImageService` (wait max 30 s, else 429 `RATE_LIMITED` "Đang xử lý ảnh khác, thử lại") so concurrent uploads cannot stack decoded bitmaps in the 512 MB heap [RT#8]. Path `{uploads}/{sha[0:2]}/{sha}-{w}.{ext}`; URL `/uploads/...` served by Caddy with `immutable` cache. Orphans kept (YAGNI cleanup).

### Admin web (antd; client components + TanStack Query)

`/admin/products` (list + filter column + expandable rows + bulk bar), product modal (3 tabs, nested quick-create dialogs, image panel right, "Quy cách & giá" card with live "Đơn giá/gói" and warning box, footer "Hiển thị trên web" + Bỏ qua + Lưu; price cells read-only for EDITOR; "Chưa có ảnh" warning), `/admin/categories` (draggable Tree depth 2 + form + attribute-set table), `/admin/brands` (table + dialog + merge). "Xuất file" button hidden (not in spec). Large KiotViet-style modal confirmed by the owner (decision C, 2026-10-29). Admin landing [decision A]: `/admin` redirects to `/admin/products` (no dashboard).

## Related Code Files

Create (api `D:\dna-web\apps\api\src\main\java\vn\dnahoangnguyen\api\`):
- `catalog\category\Category.java`, `CategoryAttribute.java`, `CategoryRepository.java`, `CategoryService.java`, `CategoryAdminController.java`, `CategoryDtos.java`
- `catalog\brand\Brand.java`, `BrandRepository.java`, `BrandService.java`, `BrandAdminController.java`, `BrandDtos.java`
- `catalog\product\Product.java`, `ProductImage.java`, `ProductRepository.java`, `ProductService.java`, `ChangeSource.java`, `ProductQueryService.java`, `ProductPublishRules.java`, `ProductMergeService.java`, `ProductAdminController.java`, `ProductDtos.java`
- `catalog\sku\Sku.java`, `SkuRepository.java`, `SkuCodeKey.java`
- `catalog\pricing\PriceRules.java`, `Saving.java`, `PriceHistory.java`, `PriceHistoryRepository.java`, `PriceWarnings.java`
- `catalog\slug\SlugUtil.java`, `SlugHistory.java`, `SlugHistoryRepository.java`, `SlugService.java`
- `catalog\seed\CatalogueSeedLoader.java`, `CatalogueSeedCsv.java` [RT#14]
- `common\text\TextFold.java`
- `media\Image.java`, `ImageRepository.java`, `ImageService.java`, `ImageStorage.java`, `ImageAdminController.java`
- resources: `db\migration\V10__media.sql`, `V11__catalogue.sql`, `V12__price_history.sql`, `V13__slug_history.sql`, `seed\catalogue-2026.csv` [RT#14]

Modify: `apps\api\pom.xml` (add `net.coobird:thumbnailator:0.4.21`), `common\error\ProblemCode.java` (4 codes), `application.yml` (`dna.uploads.dir`, multipart 5 MB, `dna.seed.catalogue.enabled=false`), `application-dev.yml` (`dna.seed.catalogue.enabled=true`).

Create (web `D:\dna-web\apps\web\`):
- `app\(admin)\admin\products\page.tsx`, `app\(admin)\admin\categories\page.tsx`, `app\(admin)\admin\brands\page.tsx`
- `components\admin\products\product-filter-column.tsx`, `product-table.tsx`, `product-expanded-row.tsx`, `product-editor-modal.tsx`, `sku-price-table.tsx`, `price-warning-box.tsx`, `image-panel.tsx`, `quick-create-category-dialog.tsx`, `quick-create-brand-dialog.tsx`, `bulk-action-bar.tsx`
- `components\admin\categories\category-tree.tsx`, `category-form.tsx`, `attribute-set-table.tsx`; `components\admin\brands\brand-dialog.tsx`, `brand-merge-dialog.tsx`
- `lib\admin\catalogue-api.ts`, `lib\admin\pricing-display.ts` (display-only live calc while typing; server warnings are authoritative)

Modify: `components\admin\admin-shell.tsx` (Hàng hóa submenu: Danh sách, Nhóm hàng, Thương hiệu); `app\(admin)\admin\page.tsx` (phase-2 placeholder -> `redirect('/admin/products')`, admin landing per decision A); `deploy\caddy\Caddyfile.dev` (uploads cache header).

## Implementation Steps

1. Migrations V10-V13; entities with `@Version`; repositories.
2. Pure classes first with tests: `PriceRules`, `SkuCodeKey`, `TextFold`, `SlugUtil`, `ProductPublishRules`.
3. `SlugService`, `ImageService`/`ImageStorage` (16 MP header check, semaphore).
4. Category and brand services + controllers (tree ordering, attributes, delete/move/merge).
5. `ProductService.saveAggregate` (single write path): diff incoming SKUs vs stored (add/update/remove; removal deletes here because no orders exist yet; phase 6 owns and tests "hide instead of delete when referenced by an order/quote" [contract fix]), role-guard field changes (`FORBIDDEN_FIELD`), price history + audit, recompute `search_text`.
6. Build `catalogue-2026.csv` by hand from `docs/catalogue-text.txt` (2 SV465 packing SKUs: `price_visible=false`, `needs_confirmation=true`; napkin rows priced, unflagged [V4, D1]); verify with `CatalogueSeedCsvTest`; `CatalogueSeedLoader` [RT#14].
7. `ProductQueryService` for the list (JPQL + filters, paging 15/30 rows, totals).
8. Admin screens: list -> modal -> categories -> brands. Vietnamese labels exactly as wireframes `docs/wireframes/admin-products.html`, `admin-product-edit.html`.
9. Manual check with owner on 3 seeded products (SV6C, SV465, SVRĐ1280t), including images and attribute values; on SV465 the owner sees the "Cần xác nhận quy cách" badge on Thùng/Dây 8 and either confirms (clear flag, "Hiện giá") or leaves them "Liên hệ" [V4].

<!-- Updated: Validation Session 1 - seed steps and owner check cover flagged SKUs -->


## Tests

Unit (`apps/api/src/test/java/.../catalog/...`):
- `PriceRulesTest`: `perBaseUnit(428500, 50) = 8570`; SV6C Cây `saving(31000, 12, 364750)` = PERCENT 1.9; SV320 Dây `(8570, 5, 42850)` = EQUAL; SV10C1.5 Cây `(58000, 10, 576576)` = PERCENT 0.6; SV465 Thùng `(5330, 80, 440000)` = NONE; base unit = NONE; base price 0 = NONE (no divide by zero).
- `PriceMismatchTest`: `(5330, 80, 440000, 2.0)` -> mismatch, dev 3.19 shown "+3,2%"; `(5330, 80, 426400)` -> none; dev exactly 2.0 -> none (strict >); dev -2.5 -> mismatch; threshold read from settings, change to 5.0 -> none.
- `EffectivePriceTest`: inside range, on `promo_from`, on `promo_to` (inclusive), day after -> regular; open-ended nulls; validator rejects `promo_price >= price` and `from > to`.
- `SkuCodeKeyTest`: `"SV465-4L- Gói"`, `" SV465-4L-  Gói "`, `"SV465-4L-\u00A0Gói"` and NFD `"Go\u0301i"` all -> `"SV465-4L- GÓI"`; `"SV465-4L-Gói"` -> different key; `"SVRĐ1280t 6G"` and `"svrđ1280t 6g"` -> `"SVRĐ1280T 6G"`; `"SVRD1280t 6G"` -> different key; `"SV465\u20134L- Gói"` (en dash) -> `-`; `"SV12C1.4Kg 4L(SV1412) G"` keeps dot and parentheses; zero-width removed.
- `TextFoldTest`: "Giấy rút đáy" -> "giay rut day"; "SVRĐ1280t" -> "svrd1280t".
- `SlugUtilTest`: "Giấy rút đáy Sen Vàng" -> `giay-rut-day-sen-vang`; "Pin Con Thỏ Đại - R20S" -> `pin-con-tho-dai-r20s`; "Giấy ăn & giấy vệ sinh" -> `giay-an-giay-ve-sinh`; "Pin 9V- Vuông" -> `pin-9v-vuong`; "!!!" -> fallback; 200-char name cut at hyphen <= 80.
- `ProductPublishRulesTest`: missing category / priced visible SKU each reported in `missing[]`; missing image -> publishable with warning `NO_IMAGE` [RT#15].
- `CatalogueSeedCsvTest` [RT#14]: 69 rows, 32 distinct `product_key`, every product exactly one `is_base` row with conversion 1, all conversions positive integers matching the catalogue unit text, distinct `code_key`s, every code appears verbatim in `docs/catalogue-text.txt`, sum of prices equals the total computed by hand when building the CSV (recorded in the test); exactly 2 rows have `price_visible=false` + `needs_confirmation=true` and they are `SV465-4L- T80`, `SV465-4L- G8`; `SV300-3L-Gói` (3229) and `SP000014` (32290) are `price_visible=true` + `needs_confirmation=false` [V4, D1].

Integration (Testcontainers):
- `SlugServiceIT`: suffix `-2`; rename creates history; A->B->C: A and B resolve to the entity; another product taking old slug A removes history row.
- `ProductServiceIT`: price change writes `price_history` + `audit_log` in one tx (rollback leaves neither); EDITOR price change -> 403 `FORBIDDEN_FIELD`, EDITOR description change ok; stale version -> 409 `VERSION_CONFLICT`; duplicate `code_key` -> 409 `DUPLICATE`; second base SKU rejected; publish without category -> 422 `PUBLISH_REQUIREMENTS_UNMET`; publish without image -> ok + product listed under "Cần bổ sung"; `search_text` recomputed for every `ChangeSource`.
- `CatalogueSeedLoaderIT` [RT#14]: empty DB -> 32 draft products / 69 SKUs, codes stored verbatim, `price_history.source=SEED`; exactly the 2 SV465 packing SKUs stored with `price_visible=false` + `needs_confirmation=true` and the SV465 product listed under "Cần bổ sung"; all other SKUs, incl. napkin `SV300-3L-Gói` + `SP000014`, `price_visible=true` + unflagged [V4, D1]; second run -> no new rows; one pre-existing code -> skipped, others loaded.
- `ProductServiceIT` addition [V4]: EDITOR clearing `needs_confirmation` -> 403 `FORBIDDEN_FIELD`; MANAGER clears it -> audit row.

<!-- Updated: Validation Session 1 - seed tests assert flagged SKUs hidden-price and flagged; Session 3 (D1) - only SV465 packing SKUs, napkin visible -->
- `CategoryServiceIT`: level-3 rejected; delete non-empty -> 409 with count; move then delete ok; attribute set inherited by child.
- `BrandServiceIT`: merge moves products and leaves redirect; delete non-empty -> 409.
- `ProductMergeServiceIT`: SKUs moved, source slug redirects to target, source removed or discontinued.
- `ImageServiceTest`: rejects GIF, WebP, `.jpg`-renamed text, 6 MB, 6000x6000 and 20000x20000 headers (before decode) [RT#8]; 4000x4000 accepted; same bytes twice -> one row; 400px source -> no 600/1200 upscale; EXIF gone; two concurrent uploads processed one at a time (semaphore).
- `ProductAdminControllerTest` (`@WebMvcTest`): list filters bind; CSRF required.

Web (Vitest): `pricing-display.test.ts` (same numbers as `PriceRulesTest`, display formatting `8.570đ`, `1,9%`).

## Success Criteria

- [ ] Seed loads 69 SKUs / 32 draft products; 10 random SKU prices match `docs/catalogue-text.txt` to the đồng [RT#14]; the 2 SV465 packing SKUs show the admin badge and "Liên hệ" on the storefront, the napkin SKUs show prices (checked again in phase 5) [V4, D1].
- [ ] Owner completes 3 seeded products in the admin end to end, incl. images and attribute values.
- [ ] Mismatch warning appears for SV465 Thùng 440.000 ("+3,2%") and disappears at 426.400; threshold change in DB takes effect without restart.
- [ ] Price history shows who/when/old/new for every price change; audit log has PUBLISH/PRICE_CHANGE rows.
- [ ] Slug rename -> old slug resolves via history (verified by `SlugServiceIT`; HTTP redirect verified in phase 5).
- [ ] EDITOR cannot change prices or publish (UI disabled + API 403).
- [ ] All tests above green in CI.

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| Admin modal + editable SKU table takes longer than estimated | H x M | antd `Form.List` + `Table`; no extra features (export, column chooser, favourites star) |
| Hand-built seed CSV has a typo (code or price) [RT#14] | M x H | `CatalogueSeedCsvTest` checks count, verbatim codes, conversions and price total; owner spot-checks 10 prices |
| Spec vs wireframe on brand delete (spec B2 "chặn" vs `admin-product-edit.html` confirm "xóa ... với tất cả N mã hàng") | M x L | Follow spec: block + offer merge; flag to owner |
| Conversion not integer in KiotViet (`conversionValue` is double in API) | L x M | `int` now; parser in phase 4 rejects non-integers with a clear error; widen to `numeric` only if real data needs it |
| Promo start/end not visible immediately [RT#13] | M x L | Effective price evaluated at read time; storefront cache <= 60 s; order repriced server-side (phase 6) |
| Image decode exhausts heap [RT#8] | L x H | 16 MP header cap before decode; single-permit semaphore |
| Concurrent edit by 2 admins | L x M | `@Version` on product and SKU, 409 message in UI |

Rollback: phase not deployed to prod; revert merge commit; Flyway V10-V13 only on dev DBs (drop and recreate).
