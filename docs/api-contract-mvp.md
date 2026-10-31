# API contract (MVP)

Single source of truth for request/response shapes between `apps/api` (Spring) and `apps/web` (Next). All ```ts blocks are copied verbatim into `apps/web/lib/api/types.ts` by the lead; keep them valid TypeScript with no imports.

## Conventions

- JSON, camelCase. Money = integer VND (`number`). Percent = number with 1 decimal (`1.9`). Timestamps ISO-8601 with offset, dates `YYYY-MM-DD`.
- Errors: `application/problem+json` `{type,title,status,detail,instance,code,errors?}` (+ extension fields). `detail` is Vietnamese. Codes: `VALIDATION_FAILED UNAUTHENTICATED FORBIDDEN NOT_FOUND VERSION_CONFLICT DUPLICATE RATE_LIMITED CONFLICT_STATE CATEGORY_NOT_EMPTY BRAND_NOT_EMPTY PUBLISH_REQUIREMENTS_UNMET FORBIDDEN_FIELD PRICE_CHANGED SKU_NOT_ORDERABLE CAPTCHA_FAILED CAPTCHA_REQUIRED INVALID_TRANSITION INTERNAL`.
- Public GET endpoints: no auth. Public POST endpoints (`/api/public/**`, `/api/webhooks/**`): anonymous, CSRF-exempt.
- Admin: session cookie `DNA_SESSION`; non-GET requests carry header `X-XSRF-TOKEN` = cookie `XSRF-TOKEN` (call `GET /api/auth/csrf` first). Unauthenticated `/api/admin/**` = 401 problem (never a redirect). EDITOR forbidden = 403 problem.
- Hidden prices: a SKU with `priceVisible=false` has every price field `null` in EVERY public response (single `PublicPriceRedactor`); hidden lines never count in computed totals.

```ts
export interface ProblemBody {
  type?: string; title?: string; status: number; detail: string; instance?: string;
  code: string; errors?: { field: string; message: string }[];
  [extension: string]: unknown;
}
export interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface Crumb { name: string; href: string }
export type SavingKind = "PERCENT" | "EQUAL" | "NONE";
```

## Auth and settings

| Method + path | Body / query | Response |
|---|---|---|
| `GET /api/auth/csrf` | - | 204, sets `XSRF-TOKEN` |
| `POST /api/auth/login` | form-urlencoded `username`, `password` | 200 `AdminSession`; 401 problem `UNAUTHENTICATED` (identical body for every failure); 429 `RATE_LIMITED` |
| `POST /api/auth/logout` | - | 204 |
| `GET /api/admin/me` | - | 200 `AdminSession`; 401 |
| `POST /api/admin/me/password` | `{currentPassword,newPassword}` | 204 |
| `GET /api/public/settings` | - | `PublicSettings` |
| `GET /api/admin/settings` | - | `AdminSettings` |
| `PUT /api/admin/settings/bank` (MANAGER) | `BankSettingsUpdate` | 200 `BankInfo`; wrong password = 403 `FORBIDDEN` |

```ts
export type Role = "EDITOR" | "MANAGER";
export interface AdminSession { username: string; displayName: string; role: Role }
export interface CompanyInfo { name: string; taxCode: string; address: string; warehouse: string; phone: string; email: string }
export interface BankInfo { bankName: string; bin: string; accountNo: string; accountName: string }
export interface PublicSettings { company: CompanyInfo; hotline: string; zalo: string | null; trustStrip: string[] }
export interface AdminSettings {
  company: CompanyInfo; bank: BankInfo; notifyOwnerEmail: string;
  pricingMismatchThresholdPct: number; discountTiers: { threshold: number; pct: number }[];
}
export interface BankSettingsUpdate extends BankInfo { currentPassword: string }
```

## Public catalogue (read-only)

| Path | Notes |
|---|---|
| `GET /api/public/nav` | `Nav` |
| `GET /api/public/home` | `HomeData` |
| `GET /api/public/categories/{slug}?brand=<slug>&brand=<slug>&sort=&page=1` | `CategoryListing`, page size 24; `sort` = `name_asc` (default) `name_desc` `price_asc` `price_desc` (price sorts on `fromPrice`, null/"Liên hệ" last). Level-1 includes its children's products |
| `GET /api/public/brands/{slug}?category=<slug>&sort=&page=1` | `BrandListing` |
| `GET /api/public/products/{slug}` | `PublicProduct`; unknown or unpublished = 404 `NOT_FOUND`; DISCONTINUED is returned with `status` |
| `GET /api/public/search?q=&page=1` | `SearchResult`; diacritic-insensitive, tokens ANDed, exact SKU code first |
| `GET /api/public/search/suggest?q=` | `Suggest` (min 2 chars, max 8) |
| `GET /api/public/sitemap` | `SitemapData` |

```ts
export interface PublicSku {
  id: number; code: string; unitName: string; conversion: number; isBase: boolean;
  priceVisible: boolean;                    // false => show "Liên hệ"; all price fields below are null
  price: number | null;                     // regular price
  effectivePrice: number | null;            // promo price while the promo is active, else price
  promoActive: boolean; promoPrice: number | null; promoTo: string | null;
  perBaseUnit: number | null;               // round(effectivePrice / conversion), HALF_UP
  saving: { kind: SavingKind; pct: number | null };
  // saving vs base unit: pct=(baseEff*conv-packEff)/(baseEff*conv)*100 (1 decimal).
  // PERCENT if pct>=0.1; EQUAL ("Bằng giá mua lẻ") if pct>=0 and rounds to 0.0; NONE if negative, base unit, hidden, or base price missing/0
}
export interface ProductCard {
  id: number; slug: string; name: string; brand: { name: string; slug: string } | null;
  imageUrl: string | null; specLine: string | null;
  fromPrice: number | null;                 // lowest effective per-base-unit price among visible-priced SKUs; null => "Liên hệ"
  fromUnitName: string | null;              // base unit name
  hasMultipleUnits: boolean;                // true => "Từ 8.570đ / gói"
  units: { name: string; priceVisible: boolean }[];
}
export interface PublicProduct {
  id: number; slug: string; name: string; status: "ACTIVE" | "DISCONTINUED";
  brand: { name: string; slug: string } | null; category: { name: string; slug: string } | null;
  breadcrumb: Crumb[]; imageUrl: string | null; specLine: string | null; descriptionMd: string | null;
  baseCode: string; skus: PublicSku[];      // visible SKUs only, base first then by conversion
  related: ProductCard[];                   // up to 5 from the same category
  seoTitle: string | null; seoDescription: string | null;
}
export interface NavCategory { id: number; name: string; slug: string; productCount: number; children: { id: number; name: string; slug: string; productCount: number }[] }
export interface Nav { categories: NavCategory[]; brands: { name: string; slug: string; productCount: number }[] }
export interface HomeData {
  categories: { name: string; slug: string; productCount: number }[];
  brands: { name: string; slug: string; productCount: number }[];
  sections: { category: { name: string; slug: string }; products: ProductCard[] }[];   // 5 per level-1 category
}
export interface CategoryListing extends Page<ProductCard> {
  category: { id: number; name: string; slug: string; description: string | null; parent: { name: string; slug: string } | null };
  breadcrumb: Crumb[];
  children: { name: string; slug: string; productCount: number }[];
  facets: { brands: { name: string; slug: string; count: number }[] };
}
export interface BrandListing extends Page<ProductCard> {
  brand: { name: string; slug: string; description: string | null }; breadcrumb: Crumb[];
  facets: { categories: { name: string; slug: string; count: number }[] };
}
export interface SearchResult extends Page<ProductCard> { q: string }
export interface Suggest { items: { name: string; slug: string; code: string | null }[] }
export interface SitemapData { products: { slug: string; updatedAt: string }[]; categories: { slug: string }[]; brands: { slug: string }[] }
```

## Public sales

| Method + path | Notes |
|---|---|
| `POST /api/public/cart/price` | body `{lines: CartLineIn[]}` -> `PricedCart` (dry run, same code as submit) |
| `POST /api/public/quotes` | `QuoteSubmit` -> 201 `QuoteView` (200 with the stored one on a repeated `submissionId`) |
| `POST /api/public/orders` | `OrderSubmit` -> 201 `OrderView` (200 on replay); 409 `PRICE_CHANGED` with extension `pricedCart: PricedCart`; 422 `SKU_NOT_ORDERABLE`; 400 `VALIDATION_FAILED` (also honeypot `website` filled); 429 `RATE_LIMITED` + `Retry-After` |
| `POST /api/public/orders/lookup` | `{code, phone}` -> `OrderView`; any mismatch = 404 `NOT_FOUND` with one generic message |

Behaviour details: `OrderView.bank` is `null` while the bank account number is not configured in settings; `qrAmount` is only ever set for `BANK_TRANSFER`; a non-orderable or unavailable line answers 422 `SKU_NOT_ORDERABLE` (checked before the `expectedTotal` comparison) with the extension `pricedCart`, and quotes also answer 422 when a line is `unavailable`; a quote line's `listPrice` equals its `unitPrice` (quotes store no list price); an admin transition with a missing required field answers 400 `VALIDATION_FAILED` with `errors[].field` = the `OrderTransitionField` name.

Rules: `qty` 1..9999, max 50 lines, duplicate SKUs merged; server ignores client prices; phone normalised (`+84`/`84` -> `0`, `^0\d{9,10}$`); lookup normalises the code (uppercase, drop spaces/hyphens, `O`->`0`, `I`/`L`->`1`); codes: orders `DNA`+6 Crockford base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`), quotes `BG`+6. `expectedTotal` = the `PricedCart.total` the client last displayed. Discount ladder (`discount.tiers`, empty at launch = off): highest tier with `threshold <= subtotal` (post-promo), `discountTotal = round(subtotal*pct/100)`, one figure + `discountNote`. Orders cannot contain hidden-price lines (`SKU_NOT_ORDERABLE`); quotes can (priced `null`).

```ts
export interface CartLineIn { skuId: number; qty: number }
export interface PricedLine {
  skuId: number; unavailable: boolean;      // true => sku missing/unpublished/discontinued (other fields empty/null)
  code: string; productName: string; productSlug: string; unitName: string; conversion: number; qty: number;
  priceVisible: boolean; orderable: boolean;
  listPrice: number | null; unitPrice: number | null; lineTotal: number | null;   // unitPrice = effective (post-promo)
}
export interface PricedCart { lines: PricedLine[]; subtotal: number; discountTotal: number; discountNote: string | null; total: number; hasContactLines: boolean }
export interface QuoteSubmit {
  submissionId: string; customerName: string; phone: string; email?: string; company?: string; taxCode?: string; note?: string;
  website?: string; lines: CartLineIn[];
}
export type QuoteStatus = "NEW" | "QUOTED" | "WON" | "CANCELLED";
export interface QuoteView { code: string; status: QuoteStatus; createdAt: string; customerName: string; lines: PricedLine[]; subtotal: number; hasContactLines: boolean }
export interface OrderSubmit {
  submissionId: string; customerName: string; phone: string; address: string; note?: string;
  paymentMethod: PaymentMethod; expectedTotal: number; website?: string; lines: CartLineIn[];
}
export type PaymentMethod = "COD" | "BANK_TRANSFER";
export type OrderStatus = "PENDING" | "CONFIRMED" | "PAID" | "ENTERED_KIOTVIET" | "SHIPPING" | "COMPLETED" | "CANCELLED";
export interface OrderItemView { skuCode: string; productName: string; unitName: string; conversion: number; qty: number; listPrice: number; unitPrice: number; lineTotal: number }
export interface OrderView {
  code: string; status: OrderStatus; paymentMethod: PaymentMethod; createdAt: string;
  customerName: string; phoneMasked: string;                 // "0912 *** 678", never the address
  items: OrderItemView[]; subtotal: number; discountTotal: number; discountNote: string | null;
  shippingFee: number | null;                                // null until staff confirm
  total: number;                                             // subtotal - discountTotal + (shippingFee ?? 0)
  bank: (BankInfo & { content: string }) | null;             // BANK_TRANSFER and status PENDING or CONFIRMED only; content = order code
  qrAmount: number | null;                                   // = total only when CONFIRMED with shippingFee set; null => account + content as text, NO QR
  paidAt: string | null;
}
export interface LookupRequest { code: string; phone: string }
```

## Admin: catalogue

| Method + path | Notes |
|---|---|
| `GET /api/admin/products?q=&categoryId=&brandId=&published=&needsAttention=&page=1&size=30` | `AdminProductList` |
| `GET /api/admin/products/{id}` | `AdminProduct` |
| `POST /api/admin/products` | body `AdminProduct` without ids -> 201 `AdminProduct` |
| `PUT /api/admin/products/{id}` | body `AdminProduct` with `version`s -> `AdminProduct`; 409 `VERSION_CONFLICT`; EDITOR touching price/priceVisible/needsConfirmation/promo/conversion/code/isBase = 403 `FORBIDDEN_FIELD` |
| `POST /api/admin/products/{id}/publish` `/unpublish` `/discontinue` `/reactivate` (MANAGER) | -> `AdminProduct`; publish needs a category and >= 1 visible priced SKU else 422 `PUBLISH_REQUIREMENTS_UNMET` (extension `missing: string[]`). No image = allowed, warning `NO_IMAGE` |
| `GET /api/admin/categories` | tree `AdminCategory[]` |
| `POST /api/admin/categories` `{name, parentId?}` / `PUT /api/admin/categories/{id}` `{name, description?, visible, sortOrder}` | `AdminCategory`; depth <= 2 else 422 |
| `GET /api/admin/brands` / `POST /api/admin/brands` `{name}` / `PUT /api/admin/brands/{id}` `{name, visible}` | `AdminBrand` |

"Cần bổ sung" (`needsAttention`) = no image or any SKU `needsConfirmation` or (unpublished and (no category or no visible priced SKU)). Price mismatch warning: `|price - basePrice*conversion| / (basePrice*conversion) * 100 > threshold` (default 2.0, both directions, warning only). Every price change writes `price_history` + audit in the same transaction.

```ts
export interface AdminProductRow {
  id: number; name: string; slug: string; brandName: string | null; categoryName: string | null;
  published: boolean; status: "ACTIVE" | "DISCONTINUED"; skuCount: number; baseCode: string | null; basePrice: number | null;
  needsAttention: boolean; needsConfirmation: boolean; updatedAt: string;
}
export interface AdminProductList { items: AdminProductRow[]; page: number; size: number; total: number; totals: { products: number; skus: number; visibleSkus: number } }
export interface AdminSku {
  id: number | null; version: number | null; code: string; name: string | null; unitName: string; conversion: number; isBase: boolean;
  price: number | null; priceVisible: boolean; needsConfirmation: boolean;
  promoPrice: number | null; promoFrom: string | null; promoTo: string | null;
  visible: boolean; source: "MANUAL" | "SEED" | "KIOTVIET";
  perBaseUnit: number | null;                       // read-only, computed
  warnings: { type: "PRICE_MISMATCH"; message: string; deviationPct: number }[];   // read-only
}
export interface AdminProduct {
  id: number | null; version: number | null; name: string; slug: string;
  brandId: number | null; categoryId: number | null; descriptionMd: string | null; specLine: string | null; imageUrl: string | null;
  seoTitle: string | null; seoDescription: string | null; internalNote: string | null;
  published: boolean; status: "ACTIVE" | "DISCONTINUED";
  skus: AdminSku[];
  warnings: { type: "NO_IMAGE" | "NEEDS_CONFIRMATION" | "NOT_PUBLISHABLE"; message: string }[];   // read-only
  priceHistory: { skuCode: string; field: "PRICE" | "PROMO"; oldPrice: number | null; newPrice: number | null; changedBy: string | null; changedAt: string }[];   // read-only, last 50
}
export interface AdminCategory { id: number; name: string; slug: string; parentId: number | null; description: string | null; visible: boolean; sortOrder: number; productCount: number; children: AdminCategory[] }
export interface AdminBrand { id: number; name: string; slug: string; visible: boolean; productCount: number }
```

## Admin: requests (quotes + orders), bank review

| Method + path | Notes |
|---|---|
| `GET /api/admin/requests?kind=&status=&payment=&q=&awaitingKiotViet=&page=1&size=30` | `RequestList`, newest first, unified quotes + orders; `q` matches code/name/phone; optional `awaitingKiotViet=true` keeps only orders where `awaitsKiotVietEntry` holds; `RequestRow.total` of a quote = its priced subtotal (null when 0); `history` of an order or quote is oldest first |
| `GET /api/admin/requests/counters` | `RequestCounters` (bell; polled every 60 s) |
| `GET /api/admin/orders/{id}` / `GET /api/admin/quotes/{id}` | `AdminOrder` / `AdminQuote` |
| `POST /api/admin/orders/{id}/transition` | `OrderTransition` -> `AdminOrder`; 422 `INVALID_TRANSITION`; EDITOR -> PAID = 403 |
| `POST /api/admin/quotes/{id}/transition` | `{to, note?}` -> `AdminQuote` |
| `PUT /api/admin/requests/{kind}/{id}/internal-note` | `{internalNote}` -> 204 (`kind` = `orders` or `quotes`) |
| `GET /api/admin/bank-transactions?status=REVIEW&page=1&size=30` (MANAGER) | `Page<BankTransactionRow>` |
| `POST /api/admin/bank-transactions/{id}/link` (MANAGER) | `{orderId, markPaid, note?}` -> `BankTransactionRow`; `markPaid` runs the normal manual PAID transition |
| `POST /api/admin/bank-transactions/{id}/dismiss` (MANAGER) | `{note}` -> `BankTransactionRow` |
| `POST /api/webhooks/bank/sepay` | header `Authorization: Apikey <key>` (env `DNA_SEPAY_WEBHOOK_KEYS`, constant-time compare), SePay JSON body `SepayWebhook` -> 200 `{"success":true}`; 401 bad key (nothing stored); 404 when `DNA_SEPAY_ENABLED=false`. Persist first (unique per vendor tx id), then match |

Order state machine (pure class `OrderStatusMachine`): COD `PENDING -> CONFIRMED` (needs `shippingFee >= 0`) `-> ENTERED_KIOTVIET` (needs `kiotvietOrderCode`) `-> SHIPPING -> COMPLETED`; BANK_TRANSFER `PENDING -> CONFIRMED -> PAID` (MANAGER or system actor `BANK_WEBHOOK`; needs `paidAmount`, `note` when `paidAmount != total`) `-> ENTERED_KIOTVIET -> SHIPPING -> COMPLETED`; `CANCELLED` from any non-terminal (from PAID requires `note`); COD never PAID; BANK_TRANSFER cannot skip PAID. `COMPLETED` and `CANCELLED` are terminal. Total = subtotal - discountTotal + shippingFee, recomputed when the fee is set at confirm; no other edits after submit in the MVP. "Chờ nhập KiotViet" (`awaitsKiotVietEntry`) = COD in CONFIRMED or BANK_TRANSFER in PAID. Quote machine: `NEW -> QUOTED -> WON | CANCELLED`, `NEW -> CANCELLED`.
Webhook matcher (pure `PaymentMatcher`): auto-PAID only when ALL hold: exactly one distinct `DNA` + 6 code found in the normalised content (NFD strip marks, `đ`->`D`, uppercase, drop spaces/hyphens/dots/underscores, `O`->`0`, `I`/`L`->`1`), order exists, `BANK_TRANSFER`, status CONFIRMED, `transferAmount == total`, `accountNumber` == configured bank account == env `DNA_SEPAY_ACCOUNT_NO`, `transferType == "in"`. Anything else -> `REVIEW` with reason `NO_CODE MULTIPLE_CODES UNKNOWN_CODE NOT_BANK_TRANSFER NOT_CONFIRMED ALREADY_PAID AMOUNT_MISMATCH WRONG_ACCOUNT OUT_WITH_CODE` and the order is untouched; outgoing transfers without a code = `IGNORED`. Auto-PAID audit actor `BANK_WEBHOOK` (`actor_id` null).

```ts
export interface RequestRow {
  kind: "ORDER" | "QUOTE"; id: number; code: string; customerName: string; phone: string; createdAt: string; itemCount: number;
  total: number | null; paymentMethod: PaymentMethod | null; status: string; assigneeName: string | null;
}
export interface RequestList { items: RequestRow[]; page: number; size: number; total: number; totals: { count: number; totalAmount: number } }
export interface RequestCounters { newQuotes: number; pendingOrders: number; awaitingKiotViet: number; bankReview: number }
export interface HistoryEntry { at: string; actor: string; action: string; from: string | null; to: string | null; note: string | null }
export interface BankTransactionRow {
  id: number; txTime: string; amount: number; direction: "IN" | "OUT"; accountNoMasked: string; content: string;
  status: "RECEIVED" | "MATCHED" | "REVIEW" | "IGNORED"; reviewReason: string | null; orderCode: string | null; decisionNote: string | null;
}
export type OrderTransitionField = "shippingFee" | "paidAmount" | "note" | "kiotvietOrderCode";
export interface AdminOrder {
  id: number; code: string; status: OrderStatus; paymentMethod: PaymentMethod; createdAt: string;
  customerName: string; phone: string; address: string; note: string | null; internalNote: string | null;
  items: (OrderItemView & { skuId: number })[];
  subtotal: number; discountTotal: number; discountNote: string | null; shippingFee: number | null; total: number;
  paidAmount: number | null; paidVia: "MANUAL" | "BANK_WEBHOOK" | null; paidAt: string | null; kiotvietOrderCode: string | null;
  awaitsKiotVietEntry: boolean;
  allowedTransitions: { to: OrderStatus; requires: OrderTransitionField[] }[];   // already filtered by the caller's role
  history: HistoryEntry[]; bankTransactions: BankTransactionRow[];
}
export interface OrderTransition { to: OrderStatus; shippingFee?: number; paidAmount?: number; kiotvietOrderCode?: string; note?: string }
export interface AdminQuote {
  id: number; code: string; status: QuoteStatus; createdAt: string;
  customerName: string; phone: string; email: string | null; company: string | null; taxCode: string | null; note: string | null; internalNote: string | null;
  lines: { skuCode: string; productName: string; unitName: string; conversion: number; qty: number; unitPrice: number | null; lineTotal: number | null }[];
  subtotal: number; hasContactLines: boolean;
  allowedTransitions: { to: QuoteStatus }[]; history: HistoryEntry[];
}
export interface SepayWebhook {
  id: number | string; gateway?: string; transactionDate?: string; accountNumber: string; subAccount?: string | null; code?: string | null;
  content: string; transferType: "in" | "out"; description?: string; transferAmount: number; accumulated?: number; referenceCode?: string;
}
```

## Static facts both sides rely on

- Order/quote Vietnamese labels (FE): orders PENDING "Chờ xác nhận", CONFIRMED "Đã xác nhận", PAID "Đã nhận tiền", ENTERED_KIOTVIET "Đã nhập KiotViet", SHIPPING "Đang giao", COMPLETED "Hoàn tất", CANCELLED "Hủy"; quotes NEW "Mới", QUOTED "Đã báo giá", WON "Chốt", CANCELLED "Hủy".
- Web server-side fetches use `API_INTERNAL_URL` (compose: `http://api:8080`), browser calls are same-origin `/api/...`.
- VietQR is built in the browser (`apps/web/lib/vietqr/emvco.ts`) from `OrderView.bank` + `qrAmount` + `bank.content`; the API never generates QR payloads.
