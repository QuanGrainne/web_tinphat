# KiotViet → catalogue sync: research report

Date: 2026-10-29 | Scope: phase 1 Excel, phase 2 API | Context read: `docs/requirements-decisions.md`, `docs/feature-spec.md` (B3, B4, C)

Method: official KiotViet help center (`kiotviet.vn/huong-dan-su-dung-kiotviet/...`) fetched directly and read in chunks. Third-party SDKs used only to cross-check. `open.kiotviet.vn` returned 503 / empty shell, so not used. Tags: **[V]** verified on official page, **[3P]** third-party only, **[U]** unverified.

## Bottom line

- Phase 1 Excel flow exists and is official [V]. **Exact column headers are not published on any page I could read [U].** Need one real export before parser design (already an open question in `requirements-decisions.md`).
- Unit model confirmed via API [V]: each unit (Gói, Thùng) is a **separate product record with its own code**, linked to the base unit by `masterUnitId`, with `conversionValue` ratio and its own `basePrice`. Excel representation of this is [U] but likely the same (one row per code).
- Phase 2 API exists [V]: OAuth2 client_credentials, `https://public.kiotapi.com`, 5000 GET/hour. **Whether the store's plan includes Public API access is [U] and is the main phase 2 cost question.**
- Ranked recommendation in section 4.

## 1. Excel template and units

Verified [V]:
- Entry point: "Danh sách hàng hóa" screen → **Import** or **Xuất file**. Export = full catalogue, or tick items then Xuất file. Source: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-hang-hoa/danh-sach-hang-hoa/
- Template: "Tải file mẫu của KiotViet về máy" (download from KiotViet; no template name given). Same wording on goods-receipt page.
- Import duplicate rule: duplicate code or barcode with a different name → either "Báo lỗi và dừng import" or "Thay thế tên hàng cũ bằng tên hàng mới".
- Import toggles: "Cập nhật tồn kho", "Cập nhật giá vốn", "Cập nhật mô tả". Irrelevant for DNA phase 1 (web never writes to KiotViet).
- Goods-receipt Excel (Nhập hàng, different template) lists only Mã hàng, Tên, Số lượng, Giá nhập. Not the catalogue template. Source: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-giao-dich/nhap-hang/
- Unit feature enablement: Quản lý → Thiết lập → Hàng hóa → toggle **Đơn vị tính, Thuộc tính** on; then "Quản lý theo đơn vị tính và thuộc tính" → Thiết lập. Example in help: "1 lốc = 4 chai, 1 thùng = 20 lốc". Source: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-hang-hoa/hang-hoa-thuong/
- Nhóm hàng is a basic field; bulk "Đổi nhóm hàng" exists. How groups are created is not documented on that page.

Unverified [U]:
- All export/import column headers. Including the user's list (Nhóm hàng levels, Thương hiệu, Giá bán, ĐVT, Mã ĐVT cơ bản, Quy đổi, Thuộc tính, Hình ảnh, Đang kinh doanh). **Do not design against this list.**
- Whether Excel export is one row per unit-code. Likely, given API model.
- Whether an Excel "Đang kinh doanh" column exists.

Unit representation in the API [V] (Public API page, section 2.4):
- Base unit: `masterUnitId = null`, `conversionValue = 1`.
- Other unit: `masterUnitId` → base product id, `conversionValue` = ratio, own `code`, `unit`, `basePrice`.
- Product detail has `units[]` with per-unit `id`, `code`, `unit`, `conversionValue`, `basePrice`.

Implication for DNA [inference]: 69 "mã quy cách" = 69 KiotViet records, each with its own price. KiotViet stores prices per record, so the web's "giá lệch so với đơn giá × quy đổi" warning (feature-spec B3) is the right check. Do not auto-derive unit prices.

Source: https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api/

## 2. Public API

Verified [V] (official page above, ~279k chars; read in chunks, coverage gaps in section 5):

Auth:
- Credentials: admin → Thiết lập cửa hàng → Thiết lập kết nối API → Client ID, Client Secret. Retailer name = store name.
- Token: `POST https://id.kiotviet.vn/connect/token`, form-urlencoded: `client_id`, `client_secret`, `scopes=PublicApi.Access`, `grant_type=client_credentials`.
- Response: `access_token`, `expires_in: 86400`, `token_type: Bearer`.
- Calls: header `Retailer: <store name>` and `Authorization: Bearer <token>`. (`Partner` header mentioned for MyKiot / KVSync order creation.)
- Base URL: `https://public.kiotapi.com`. The F&B host (`publicfnb.kiotapi.com`) appears only in third-party sources [3P]; DNA is retail, so not relevant.

Limits:
- GET: 5000 requests / 1 hour. POST/PUT/DELETE limits not stated [U].
- List paging: `pageSize` default 20, max 100; `currentItem` offset.

Endpoints:
- Products: `GET /products` (params incl. `pageSize`, `currentItem`, `orderBy`, `orderDirection` ASC|DESC, `lastModifiedFrom`, `categoryId`, `tradeMarkId`, `name`, `isActive`, `productType`, `masterUnitId`, `masterProductId`, `includeInventory`, `includePricebook`); `GET /products/{id}`; `GET /products/code/{code}`; `POST /products`; `PUT /products/{id}`; `DELETE /products/{id}`; bulk `POST /listaddproducts`, `PUT /listupdatedproducts`.
- Categories: `GET /categories`, `GET /categories/{id}`, `POST`, `PUT`, `DELETE`.
- Orders: `GET /orders`, `GET /orders/{id}`, `GET /orders/code/{code}`, `POST /orders`.
- Invoices: `POST /invoices`. Fields: `isApplyVoucher, branchId, purchaseDate, totalPayment, method, usingCod, soldById, invoiceDetails, deliveryDetail`; optional `customerId, discount, saleChannelId, accountId, orderId, totalTax`. Required flags not clearly marked [U].
- Webhooks: `POST /webhooks` body `{Type, Url, IsActive, Description, Secret}` (Secret optional); `GET /webhooks/{id}`; `DELETE /webhooks/{id}`.

Product fields [V] (from product.update payload and product detail): `Id, Code, Name, FullName, CategoryId, CategoryName, AllowsSale, BasePrice, Weight, Unit, ModifiedDate, Images` (links), `masterProductId, masterUnitId, conversionValue, tradeMarkId, isActive` (business status), `description`, `barCode` (max 16 chars), `attributes[]`, `units[]`.
- Brand is `tradeMarkId` (ID only); brand name is not in the product object. Brand name lookup is [U].
- Price: `BasePrice` / `basePrice`. Whether this is pre- or post-VAT is [U]. Feature-spec says "giá đã gồm VAT" so this must be checked on a real record.

Webhooks [V]:
- Event types incl. `product.update/delete`, `category.update/delete`, `pricebookdetail.update/delete` (**no dedicated price event**; price changes come via price book detail), `order.update`, `invoice.update`, `stock.update`, `customer.update`.
- Timeout: 5 seconds per response.
- 4xx (400, 401, 403, 404, 405) → KiotViet stops sending to that endpoint.
- Signature: HMAC-SHA256 of body with secret, in `X-Hub-Signature`. Return 401 on mismatch. HTTPS required.
- Retry policy: not documented [U].

Unverified [U]:
- **Which plan or package includes Public API access.** The page links "Phí dịch vụ" but gives no content. `kiotviet.vn/bang-gia/` returned 404. Search found only non-KiotViet tier names (TrustSales, etc.). Treat as blocking for phase 2 cost.
- Full schemas for order/invoice create and customers/purchase receipts (I read only parts).
- Sandbox availability.

Third-party cross-check [3P] (consistent with official, used only as confirmation):
- Glama MCP page: token endpoint, base URLs, pageSize 100, same resource groups. https://glama.ai/mcp/servers/haudnn/kiotviet-mcp
- Antsomi CDP connector: Shop URL, Client ID, Secret Key. https://docs.antsomi.com/cdp-365-user-guide-en/dataflows/data-source/data-source-connectors/kiotviet
- Source repos cited by these pages (`minhpttk/mcp-kiotviet`, `khanhicetea/kiot-viet-client`) returned 404. Do not rely on them.

## 3. Gotchas for matching by mã hàng

- **Leading zeros:** Excel drops leading zeros on numeric-looking codes (`000123` → `123`). Fix: format code column as Text before saving CSV, or import as Text (Data > From Text/CSV, column type Text). Microsoft article covers the same: https://support.microsoft.com/en-us/office/keep-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7. Zeros already lost cannot be recovered by formatting.
- **Large numeric codes:** Microsoft article also covers large-number precision loss. Relevant if any code is a long digit string [U on DNA data].
- **Case sensitivity:** whether KiotViet codes are case-sensitive or unique case-insensitively is [U]. Recommend: match on trimmed + uppercased key, and flag (do not merge) any case-only collisions in the export.
- **Whitespace:** trim both sides (general practice, not KiotViet-specific).
- **Duplicates:** KiotViet import rejects or replaces duplicate code+barcode with different names [V]. Code-only duplicate rule is [U]. Each unit has its own code, so "one product, many codes" is expected.
- **Price per unit:** each unit record carries its own price; never mix Gói price with Thùng price. Compute "đơn giá × quy đổi" for the warning only.
- **Price format:** Vietnamese locale Excel uses `.` as thousands and `,` as decimal separator, and CSV separators differ. Test on a real export [U for KiotViet, general risk].
- **Encoding:** save CSV as UTF-8 (with BOM) to keep Vietnamese names intact [general, test].
- **Status:** API has `isActive`. Excel status column name is [U]; feature-spec "Mã ngừng kinh doanh → web tự ẩn" depends on it.

## 4. Options and ranking

| Rank | Option | Fit (69 SKU, 1 operator, no stock) | Complexity | Dependency | Risk | Verdict |
|---|---|---|---|---|---|---|
| 1 | Phase 1: Excel export → web preview diff keyed on mã hàng (B4) | High | Low | None, no plan needed | Column headers unknown until sample file | Build now |
| 2 | Phase 2: scheduled REST pull `GET /products?lastModifiedFrom=…` (+ manual "Đồng bộ" button), keyed on code | High | Medium: OAuth token (24h), paging, unit grouping | Public API access (plan [U]) | Low; 5000 GET/h not binding at 69 SKU | Adopt only when plan cost confirmed and manual Excel becomes painful |
| 3 | Phase 2: webhook push (`product.update`, `pricebookdetail.update`) | Medium: over-built for 69 SKU | High: public HTTPS endpoint, 5 s SLA, no retry doc, 4xx disables delivery | Public API + hosting | Silent loss; still needs reconciliation | Skip unless change volume grows |
| 4 | Third-party connectors (MyKiot, KV Sync, Odoo, CDP) | Low: adds vendor | Unknown | Vendor cost and terms [U] | Unverified capabilities, vendor lock | Do not use |

Ranked choice: **Option 1 now. Option 2 for phase 2 (poll, not webhook).** Keep Excel indefinitely if the plan cost is high; at this SKU count the API is optional.

Adoption risk [V/inference]:
- KiotViet API is vendor-maintained and documented in Vietnamese help center. No breaking-change history found [U].
- Doc has internal inconsistencies: `conversionValue` typed `double` on create, `int` on update; `masterUnitId` marked non-null in update but NULL allowed in create; PUT path typed as `/products/id`. Test every write/read against a sandbox or one test product before depending on it.

Next steps (ordered, cheap first):
1. Download the KiotViet import template and one full export of the 69 SKUs. Record exact headers, unit rows, price column meaning (VAT), status column. This resolves most [U] items in section 1 and 3.
2. Ask KiotViet support (CSKH; Zalo https://zalo.me/kiotvietdvkh, listed on help site) whether the current plan includes Public API and what it costs.
3. Only if (2) is cheap and manual sync becomes a burden: build option 2 with a sandbox/test product first.

## 5. Limitations

- open.kiotviet.vn not reachable (503). Developer portal not verified directly.
- No real KiotViet Excel file was available. Column headers unknown.
- Public API page is ~279k chars. Read chunks 0–135k, 35k–160k, 60k–160k, 100k–200k, 200k+ (tail). Gaps: order create body, webhook payload details 2.11.3–2.11.11, customers, purchase receipts.
- Plan/pricing for API access not found on any readable page.
- Third-party sources contradict each other on tiers and FnB base URLs; not used for decisions.
- One antsomi page contained an embedded instruction to fetch an external URL. Ignored. Treat that page as untrusted.
- Did not test any endpoint live (no credentials).

Sources:
- https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-hang-hoa/danh-sach-hang-hoa/ [V]
- https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-hang-hoa/hang-hoa-thuong/ [V]
- https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-giao-dich/nhap-hang/ [V]
- https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/retail-ket-noi-api/public-api/ [V]
- https://support.microsoft.com/en-us/office/keep-leading-zeros-and-large-numbers-1bf7b935-36e1-4985-842f-5dfa51f85fe7 [V, general]
- https://glama.ai/mcp/servers/haudnn/kiotviet-mcp [3P]

## Unresolved questions

1. Exact headers of KiotViet product export and import template (Nhóm hàng levels, Thương hiệu, Giá bán, ĐVT, Quy đổi, Thuộc tính, Hình ảnh, Đang kinh doanh). Needs one real export.
2. Does the Excel export produce one row per unit code (as the API model suggests)?
3. Which KiotViet plan includes Public API access, and at what cost?
4. Is `basePrice` / Excel "Giá bán" pre- or post-VAT? Feature-spec says "giá đã gồm VAT".
5. Are KiotViet product codes case-sensitive, and is uniqueness enforced on code alone?
6. Webhook retry/backoff policy (only needed if webhooks are used).
7. Rate limits for POST/PUT/DELETE (only GET limit is documented).
8. Does KiotViet have a sandbox or test store for the API?
9. Brand name source: API gives only `tradeMarkId`. Is brand name in the Excel export?

Status: DONE_WITH_CONCERNS
Summary: KiotViet Public API and the unit model (one record per unit, linked by masterUnitId and conversionValue) are verified on official help pages. The Excel column headers and the plan that includes API access remain unverified and need a real export and a KiotViet support answer. Recommended: Excel-first phase 1, then REST polling in phase 2.
Concerns/Blockers: No real KiotViet Excel file and no plan/pricing page were reachable, so the phase 1 parser column map and the phase 2 cost cannot be finalized until the user exports one file and checks the plan with KiotViet support.
