---
phase: 4
title: "KiotViet Excel import"
status: pending
priority: P2
effort: "1.25-1.75 pw (estimate; options matrix dropped; +0.5 if the export has no base-unit link column)"
dependencies: [3, 6]
---

# Phase 4: KiotViet Excel import

## Overview

Spec B4. Upload a KiotViet product export (.xlsx), see a preview diff keyed on mã hàng, untick rows, resolve manual-vs-KiotViet price conflicts, apply atomically. Web never writes to KiotViet. Runs after phase 7 in the sequential order (1,2,3,5,6,7,4,8); **not a launch blocker** [RT#14]: the initial 69 codes come from the phase-3 seed, and import acceptance is tested separately once the owner's export exists. If it slips past go-live it ships as a normal post-launch release (see Data for migration numbering).

**External dependency (this phase only):** owner provides (a) one full KiotViet export of the 69 codes and (b) the KiotViet import template. Headers, one-row-per-unit, base-unit link, status column and VAT meaning are all unverified ([KiotViet report](../reports/researcher-261029-kiotviet-excel-api-report.md) s.1, s.5).

## Requirements

- Step 1 (simplified [RT#10]): file picker, "Cập nhật lần cuối: ...", and a read-only "Quy tắc nhập" box with the fixed rules: mã đã có -> cập nhật tên/ĐVT/quy đổi/giá theo file; mã mới -> "Cần bổ sung" (ẩn trên web); ngừng kinh doanh trong KiotViet -> ẩn; giá nhập tay khác giá file -> hỏi từng dòng. Note "Không bao giờ nhập từ file: ảnh, mô tả, thương hiệu, SEO, danh mục web". No option radios (wireframe updated in phase 1 C11).
- Step 2: counters (Mã mới, Đổi giá, Đổi thông tin, Ngừng kinh doanh, Kinh doanh lại, Lệch giá, Không đổi, Lỗi), diff table with per-row checkbox (untick to skip), conflict rows with radio "Dùng giá KiotViet / Giữ giá nhập tay", unchanged rows hidden, button "Áp dụng N thay đổi". Nothing is written before Apply.
- KiotViet is master for code, name, unit, conversion, price; a KiotViet name change updates only the SKU/unit name (`sku.name`), the product display name (`product.name`) stays web-owned (decided [V7]); web keeps images, descriptions, categories, brands, SEO, visibility (incl. `price_visible`, `needs_confirmation`).

<!-- Updated: Validation Session 1 - KiotViet name change updates SKU name only (Q10 resolved) -->
- Mapping table "nhóm hàng KiotViet -> danh mục web", reused next time; unmapped groups leave new products without category (they show in "Cần bổ sung").
- Apply = MANAGER only; preview = EDITOR or MANAGER.

## Architecture

```
.xlsx ─> ImportController ─> KiotVietWorkbookParser ─> List<ParsedRow>
                                   (POI XSSF, ZipSecureFile limits, DataFormatter, SkuCodeKey)
CatalogueSnapshot (SKUs by code_key + versions, category_map) ─┐
ParsedRow list ─> ImportDiff.compute() (pure, fixed rules) ────┴> List<DiffRow> + Summary
  -> import_batch(status=PREVIEW, rows jsonb) -> UI step 2
Apply(batchId, selectedRowIds, choices) -> ImportApplyService (1 tx):
  lock batch FOR UPDATE, status must be PREVIEW and < 24 h old and latest
  re-read each SKU, compare @Version with snapshot -> any mismatch => 409 IMPORT_STALE, nothing written
  per affected product: ProductService.saveAggregate(..., ChangeSource.EXCEL(batchId))   [RT#10: same path as the editor]
     -> SKUs, new DRAFT products, search_text, price_history(source=EXCEL, batch), audit rows
  audit IMPORT_APPLY; status=APPLIED; setting kiotviet.lastImportAt
```

### Parser rules (`KiotVietWorkbookParser`, `KiotVietColumns`)

- File: <= 2 MB, ZIP magic `50 4B 03 04`, first sheet, <= 5000 rows. Zip-bomb limits set before opening [RT#8]: `ZipSecureFile.setMinInflateRatio(0.1)`, `ZipSecureFile.setMaxEntrySize(20 MB)`; violations -> 400 `FILE_REJECTED`.
- Header row = first row within rows 1-5 matching required aliases. `KiotVietColumns` holds alias lists per field (code, name, unit, conversion, base code, price, group, active); confirmed against the real export in step 1 and documented in `docs/kiotviet-excel-format.md`. Required: code, name, price. Missing required -> 400 `FILE_REJECTED` listing missing headers.
- Code: read with `DataFormatter`; NUMERIC cell -> row error "Mã dạng số, có thể đã mất số 0 đầu. Định dạng cột Mã hàng là Text rồi xuất lại."; raw string kept verbatim; `key = SkuCodeKey.of(raw)` (rules in phase 3).
- **Messy-code normalisation examples (must hold):** `"SV465-4L- Gói"` keeps its inner space: key `SV465-4L- GÓI`; NBSP, double space, trailing space, NFD "ó" all collapse to that same key; `"SV465-4L-Gói"` is a *different* key (KiotViet treats it as a different code). `"SVRĐ1280t 6G"` -> `SVRĐ1280T 6G` (Đ is not folded; case-insensitive match); `"SVRD1280t 6G"` -> different key. No near-duplicate warnings [RT#10]: a genuinely new spelling shows as "Mã mới" and is fixed with phase-3 "Gộp sản phẩm". Never strip leading zeros, dots, parentheses or the unit word ("Gói", "6G") from a code.
- Price: numeric cell -> `long` (fraction -> row error); text -> strip `.`, `,`, spaces, `đ` then parse; negative -> error. Conversion: integer > 0 else error (missing = 1 only for a base row). Active: `1/true/Có/Đang kinh doanh` -> true, `0/false/Không/Ngừng kinh doanh` -> false, column absent -> null (discontinue/reactivate detection off, shown as notice).
- In-file duplicates: same key twice -> both rows ERROR.

### Diff (`ImportDiff`, pure, no Spring; fixed rules [RT#10])

Row kinds: `NEW`, `UPDATED{fields: PRICE|NAME|UNIT|CONVERSION|GROUP}`, `PRICE_CONFLICT`, `DISCONTINUED`, `REACTIVATED`, `UNCHANGED`, `ERROR`. Web codes absent from the file produce no row and no action (a partial export must never hide products).
- `PRICE_CONFLICT`: SKU `source == MANUAL` and file price != web price **and** file price != `kiotviet_price_ack` (an acknowledged KiotViet price is not asked again). No preselected choice; Apply is disabled until each selected conflict row has a choice.
- `DISCONTINUED`: file active=false, web `kiotviet_active` true/null. `REACTIVATED`: file active=true, web `kiotviet_active=false`.
- All non-ERROR, non-UNCHANGED rows start selected; the operator unticks rows to skip them.
- New-code grouping into products: by base-code column when present (non-base row joins the product of its base, existing or new); fallback group by identical folded name; group without a conversion-1 row -> ERROR "Thiếu đơn vị cơ bản". Each new group -> one DRAFT product (name = base row name, category from `category_map` when mapped). Wrong groupings are fixed with phase-3 "Gộp sản phẩm".

### Apply effects per row

- PRICE (source KIOTVIET) or conflict choice USE_KIOTVIET: `price = file`, `source = KIOTVIET`, `price_history`. KEEP_MANUAL: price untouched, `kiotviet_price_ack = file`.
- Always: `kiotviet_price`, `kiotviet_active`, `kiotviet_group`, `last_synced_at`; NAME/UNIT/CONVERSION from file (conversion change -> audit `CONVERSION_CHANGE`). NAME writes `sku.name` only, never `product.name`; a NEW product takes the base row name once at creation, after which it is web-owned [V7].
- NEW code joining an **already published** product [RT#10]: SKU created `visible=false`, `needs_review=true` (product appears under "Cần bổ sung"; nothing new shows on the storefront until reviewed).
- DISCONTINUED: SKU `visible=false`, `auto_hidden=true`, `kiotviet_active=false`; product -> `DISCONTINUED` with `auto_discontinued=true` when all its SKUs are inactive (URL kept).
- REACTIVATED [RT#10]: `kiotviet_active=true`; SKU `visible=true` only if `auto_hidden` (a manual hide stays); product back to `ACTIVE` only if `auto_discontinued` (a manual discontinue stays); flags cleared.

### Data (Flyway V20)

- `import_batch` table and the `price_history.import_batch_id` FK now live in phase 3 (`V12`) [RT#12].
- `V20__category_map.sql`: `category_map(group_key pk, group_raw, category_id fk, updated_by, updated_at)`. A new preview cancels older PREVIEW batches (only the latest is applicable).
- Numbering: dev/CI run with `out-of-order=true` (phase 2). If this phase ships after go-live, renumber its migration above the latest prod version before release (prod keeps `out-of-order=false`).

API: `POST /api/admin/import/batches` (multipart file) -> preview; `GET /api/admin/import/batches/{id}`; `POST /api/admin/import/batches/{id}/apply {selectedRowIds, choices}`; `POST /{id}/cancel`; `GET|PUT /api/admin/import/category-map`; `GET /api/admin/import/status` (last import time). Problem codes added: `IMPORT_STALE`.

## Related Code Files

Create (api `D:\dna-web\apps\api\src\main\java\vn\dnahoangnguyen\api\kiotviet\`): `KiotVietColumns.java`, `KiotVietWorkbookParser.java`, `ParsedRow.java`, `CatalogueSnapshot.java`, `ImportDiff.java`, `DiffRow.java`, `ImportSummary.java`, `ImportBatch.java`, `ImportBatchRepository.java`, `ImportPreviewService.java`, `ImportApplyService.java`, `CategoryMap.java`, `CategoryMapRepository.java`, `ImportAdminController.java`, `ImportDtos.java`
Create (resources): `db\migration\V20__category_map.sql`; test fixtures `apps\api\src\test\resources\kiotviet\export-69-sanitised.xlsx` (real export with cost/stock columns removed), `apps\api\src\test\java\...\kiotviet\TestWorkbooks.java` (builds edge-case workbooks in code, incl. a zip bomb)
Create (web `D:\dna-web\apps\web\`): `app\(admin)\admin\import\page.tsx`, `app\(admin)\admin\import\category-map\page.tsx`, `components\admin\import\import-rules-note.tsx`, `import-summary-cards.tsx`, `import-diff-table.tsx`, `lib\admin\import-api.ts`
Create (docs): `D:\dna-web\docs\kiotviet-excel-format.md` (real headers, sample rows, quirks)
Modify: `common\error\ProblemCode.java`, `settings\SettingsService.java` (`kiotviet.lastImportAt`), `components\admin\products\product-table.tsx` ("Import file" button -> `/admin/import`). POI (`poi-ooxml`) is already in `pom.xml` from phase 6 (exports).

## Implementation Steps

1. Get the export + template from owner; write `docs/kiotviet-excel-format.md`; sanitise and commit the fixture (remove giá vốn, tồn kho, any customer data). Verify "Giá bán" is VAT-inclusive on 3 known codes.
2. `KiotVietColumns` + parser (ZipSecureFile limits) + `KiotVietWorkbookParserTest` against fixture and `TestWorkbooks`.
3. `ImportDiff` + `ImportDiffTest` (pure).
4. Migration, `ImportPreviewService` (snapshot, persist batch), `ImportApplyService` (locking, stale check, calls `ProductService.saveAggregate`, audit).
5. Category map API + screen.
6. Import screens (step 1 rules note, step 2 preview) matching the wireframe.
7. Rehearsal on a copy of the seeded dev DB: real export -> expect mostly UNCHANGED, real differences as "Lệch giá" (seed prices are MANUAL), no unexpected NEW; record time taken.

## Tests

- `KiotVietWorkbookParserTest`: aliases resolve on the real fixture; header on row 3 found; numeric code cell -> error message above; text `"000123"` kept; price `426400.0` -> 426400, `"426.400"` -> 426400, `"426,400đ"` -> 426400, `5330.5` -> error; conversion `"80"` -> 80, `2.5` -> error; trailing empty rows ignored; duplicate key -> both ERROR; `SVRĐ1280t 6G` vs `SVRD1280t 6G` -> two distinct keys, no warning; NBSP/NFD variants of `SV465-4L- Gói` match the stored key; missing price column -> `FILE_REJECTED`; PNG bytes renamed .xlsx -> `FILE_REJECTED`; 5001 rows -> rejected; 2 MB workbook with a high-ratio (bomb) entry -> `FILE_REJECTED` [RT#8].
- `ImportDiffTest`: wireframe scenario (3 new, 2 price changes, 1 discontinued, 1 conflict, 65 unchanged) -> summary matches and selected count = 7; KIOTVIET-source price change -> UPDATED[PRICE]; MANUAL-source different price -> PRICE_CONFLICT; MANUAL different price equal to `kiotviet_price_ack` -> not a conflict; MANUAL same price -> UNCHANGED; name/unit/conversion change -> UPDATED with fields; code absent from file -> no row; inactive -> active -> REACTIVATED; grouping by base code; fallback by name; group lacking conversion 1 -> ERROR.
- `ImportApplyIT` (Testcontainers): apply writes SKUs + `price_history(source=EXCEL, import_batch_id)` + `audit_log` rows from `saveAggregate` + one `IMPORT_APPLY`; `search_text` updated for renamed SKUs; renamed code updates `sku.name` while `product.name` (edited in the web admin) is unchanged [V7]; unticked row untouched; SKU edited after preview -> 409 `IMPORT_STALE`, DB unchanged; apply twice -> 409 `CONFLICT_STATE`; preview > 24 h -> 409; newer preview cancels older; EDITOR apply -> 403; new non-base code on a published product -> SKU hidden + `needs_review`; all-SKUs-discontinued product -> `DISCONTINUED` + `auto_discontinued`, URL slug kept; reactivation restores auto-hidden SKU and auto-discontinued product but not a manually hidden SKU; category map applied to new products.
<!-- Updated: Validation Session 1 - apply rule and ImportApplyIT cover SKU-name-only rename -->
- `ImportAdminControllerTest`: 2 MB limit, CSRF required, apply rejects a selected conflict row without a choice.

## Success Criteria

- [ ] Real export against the seeded catalogue: codes match by key with no unexpected NEW rows; differences shown as "Đổi giá"/"Lệch giá" with both values [RT#14].
- [ ] Changing 2 prices in the export shows exactly 2 "Đổi giá" rows; apply records history with batch id.
- [ ] A manual SKU with a different price shows as "Lệch giá" with both values and the chosen side wins; after "Giữ giá nhập tay" the same file shows no conflict.
- [ ] Stale preview cannot be applied; nothing half-applied ever.
- [ ] `docs/kiotviet-excel-format.md` documents real headers.

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| Export format differs from assumptions (headers, no unit link, no status) | H x M | Not a launch blocker any more; step 1 gate; alias map; name-based grouping + merge tool; discontinue detection disabled with notice when no status column |
| Codes saved through Excel lose leading zeros / get reformatted | M x H | Reject numeric code cells with instructions; reformatted codes show as NEW (hidden) and are reviewed, never auto-published |
| KiotViet "Giá bán" is pre-VAT | L x H | Verify on 3 known codes vs catalogue (VAT-inclusive) in step 1; do not ship apply if wrong |
| Operator applies a partial export and hides products | M x M | Absent codes never produce rows; only explicit inactive status hides |
| Zip bomb / oversized workbook exhausts heap [RT#8] | L x H | 2 MB upload cap, `minInflateRatio 0.1`, 20 MB max entry, 5000 rows |
| POI 6.0.0 regression (very new) | L x M | Pin 5.5.1 fallback; parser tests catch it |

Rollback: apply is one transaction; a bad apply is reverted by re-importing the previous file (price_history keeps old values) or by restoring the nightly dump (phase 8; restoring sacrifices later orders, see deployment guide). Code rollback = revert commits; V20 is additive.
