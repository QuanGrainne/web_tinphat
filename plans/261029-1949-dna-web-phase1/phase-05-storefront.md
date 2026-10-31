---
phase: 5
title: "Storefront"
status: pending
priority: P1
effort: "2.25-2.75 pw (estimate; on-demand revalidation removed, price redaction IT added)"
dependencies: [3]
---

# Phase 5: Storefront

## Overview

Spec A1 (fixed default layout; configurable blocks come in phase 7), A2, A3, A4, A5, A6, A14 (call/Zalo), A15, A16, A19, A20 display. Public read API in Spring, request-time SSR pages in Next with a 60 s fetch cache, localStorage quote/order baskets with header counters (review and submit pages are phase 6). Layout = pinhongngoc, style = KiotViet tokens (`docs/design-guidelines.md` s.2).

## Requirements

- Routes: `/` home, `/danh-muc/[slug]`, `/thuong-hieu/[slug]`, `/san-pham/[slug]`, `/tim-kiem?q=`. Old slugs -> 308 via `permanentRedirect`.
- Card: name (2 lines), "Từ 8.570đ / gói" (base-unit effective price; no "Từ" for single-unit products; "Liên hệ" when no visible price), button "Chọn mua"; desktop unit chips. No "Cần xác nhận quy cách" tag (admin-only, phase 1 C2). No image -> neutral placeholder [RT#15].
- Product page: gallery, code (mono, verbatim), brand, unit tiles (count = real visible SKUs), big price + unit suffix, "Giá đã gồm VAT", note "1 thùng = 50 gói · 8.570đ / gói" for non-base units, saving badge per phase-3 rule ("Tiết kiệm 1,9%" / "Bằng giá mua lẻ" / nothing), promo: strikethrough + "Sale" badge only while active, qty stepper with line total and total base units, "Thêm báo giá" + "Thêm vào giỏ" ("Thêm vào giỏ" disabled when SKU is "Liên hệ"), "Tất cả quy cách" table desktop only, "Cùng nhóm" related (5), discontinued -> notice, no buttons, `noindex`.
- Listing: breadcrumb, banner strip, filter column (brand, filterable attributes of the level-1 attribute set, unit names, category counts), sort chips (Tên A-Z, Tên Z-A, Giá thấp đến cao, Giá cao xuống thấp; "Liên hệ" items last), 24 per page; mobile: 2-col grid, "Lọc sản phẩm" / "Sắp xếp" bottom sheets with "Xóa lọc" + "Xem N sản phẩm".
- Search: folded diacritics on name, brand, codes; suggestions after 2 chars (debounce 250 ms, top 8).
- Mobile: dock (Danh mục, Trang chủ, Tra cứu đơn, Báo giá + count), replaced by sticky CTA on product page; tap targets >= 44 px; no horizontal scroll at 390 px.
- A14: desktop "Liên hệ" bubble with Gọi / Zalo; mobile hotline icon in header (design-guidelines drops the bubble on mobile; flag in plan report).
- SEO: per-page title/description/canonical, OG image, `sitemap.xml`, `robots.txt`, JSON-LD Product (one per page, `offers[]` per visible priced SKU), BreadcrumbList, Organization on home.
- Hidden prices never leave the API [RT#4]: one redaction step, `PublicPriceRedactor`, is applied by the public mapper to every public DTO and export; a SKU with `price_visible=false` gets every price field null (`price`, `effectivePrice`, `promoPrice`, `perBaseUnit`, `saving`, card `fromPrice` contribution) plus `priceVisible:false`.
- Freshness [RT#13]: customers may see a price up to ~60 s old after an admin edit or a promo boundary; order totals are always recomputed server-side on submit (409 `PRICE_CHANGED`, phase 6).

## Architecture

```
Browser ─/san-pham/x─> Caddy ─> Next (RSC, rendered per request) ─fetch(revalidate:60)─> http://api:8080/api/public/...  (internal network)
Browser ─/api/public/search/suggest─> Caddy ─> Spring                                    (client-side calls)
```

- Spring public API (`storefront` package, read-only, no session): `GET /api/public/nav` (visible tree + brands), `/api/public/settings` (public subset: company, hotline, Zalo, trust strip), `/api/public/home`, `/api/public/categories/{slug}` (filters as query params `brand`, `a.<code>`, `unit`, `sort`, `page`; returns page + facets + breadcrumb), `/api/public/brands/{slug}`, `/api/public/products/{slug}`, `/api/public/search`, `/api/public/search/suggest`, `/api/public/sitemap`. Unknown slug in `slug_history` -> `200 {kind:"REDIRECT", slug}`; Next turns it into `permanentRedirect`.
- Pricing fields come from `PriceRules` (phase 3), evaluated at read time (promo start/end need no job): `price` (regular), `effectivePrice`, `promoActive`, `perBaseUnit`, `saving{kind,pct}`; then `PublicPriceRedactor.redact(dto)` [RT#4]. Next only formats. One source of truth.
- Listing filter/sort done in memory over the category subtree (level-1 includes children). Fine for < ~2k products; revisit with SQL if catalogue grows. Price sort uses redacted prices, so hidden-price items sort with "Liên hệ" (last).
- Search: `product.search_text LIKE ALL(array['%tok%',...])` on folded tokens (escape `%`/`_`), exact `code_key` hit ranked first.
- Caching [RT#13]: every server fetch sets `next: { revalidate: 60 }`; no tags, no on-demand revalidation endpoint, no shared secret, no change events. Settings fetched the same way.
- Build-time independence [RT#9]: data-bound routes (`/`, listing, brand, product, search, `sitemap.xml`) render per request (no `generateStaticParams`, no build-time prerender of API data; mechanism chosen in the phase-2 spike); `next build` and the Docker image build never call the API.
- `server-fetch.ts` [RT#9]: base URL `API_INTERNAL_URL`; 200 -> JSON (REDIRECT handled); 404 -> `notFound()`; any other non-2xx or network error -> **throw** (route error boundary renders a Vietnamese error page, response 500), so an error is never cached as an empty list.
- Styling: port `docs/wireframes/assets/storefront.css` (after phase 1 edits) to `app/(storefront)/storefront.css`; class names kept; no Tailwind (avoids preflight clash with antd). Inter via `next/font/google` subsets `latin`, `vietnamese` (self-hosted at build). Images: plain `<img>` with `srcset` 300/600/1200 + width/height (no `next/image` optimiser: saves RAM on the 4 GB VPS).
- Basket store `lib/cart/cart-store.ts`: localStorage key `dna.cart` `{v:1, quote:[{skuId, qty}], order:[{skuId, qty}]}`, `useSyncExternalStore`, cross-tab `storage` event, qty 1-9999, max 50 lines, unknown `v` or bad JSON -> reset. No prices stored (phase 6 reprices).
- Markdown descriptions: `markdown-it` with `html: false`, links `rel="nofollow noopener"`.

### Price leak IT scaffold (owned here, extended by phases 6 and 7) [RT#4]

`PublicPriceLeakIT` (parameterised): fixture = one published product with a visible SKU and one SKU with `price_visible=false`, distinctive price 987654 (also promo 876543). A route table `PublicRouteSamples` lists every `/api/public/**` mapping with a sample request; the test first enumerates `RequestMappingHandlerMapping` and **fails if any `/api/public/**` mapping is missing from the table**, then calls each sample and asserts the response body contains none of `987654`, `987.654`, `876543`, `876.543`. Phases 6 and 7 add their routes (cart price, 409 `PRICE_CHANGED` body, price-list XLSX parsed with POI, posts/pages/home with PRODUCTS blocks) to `PublicRouteSamples`.

## Related Code Files

Create (api `D:\dna-web\apps\api\src\main\java\vn\dnahoangnguyen\api\`): `storefront\StorefrontController.java`, `StorefrontQueryService.java`, `StorefrontDtos.java`, `PublicPriceRedactor.java` [RT#4], `SearchService.java`, `settings\PublicSettingsController.java`
Create (api tests): `storefront\PublicPriceLeakIT.java`, `storefront\PublicRouteSamples.java` [RT#4]
Modify (deploy): `deploy\.env.example` (`SITE_URL`, `API_INTERNAL_URL`)

Create (web `D:\dna-web\apps\web\`):
- `app\(storefront)\storefront.css`, `app\(storefront)\danh-muc\[slug]\page.tsx`, `app\(storefront)\thuong-hieu\[slug]\page.tsx`, `app\(storefront)\san-pham\[slug]\page.tsx`, `app\(storefront)\tim-kiem\page.tsx`, `app\(storefront)\not-found.tsx`, `app\(storefront)\error.tsx`, `app\sitemap.ts`, `app\robots.ts`
- `components\storefront\site-header.tsx`, `category-menu.tsx`, `search-box.tsx`, `site-nav.tsx`, `site-footer.tsx`, `mobile-dock.tsx`, `contact-bubble.tsx`, `breadcrumb.tsx`, `product-card.tsx`, `product-grid.tsx`, `listing-filters.tsx`, `listing-sort.tsx`, `bottom-sheet.tsx`, `pagination.tsx`, `product-gallery.tsx`, `unit-picker.tsx`, `sticky-cta.tsx`, `all-units-table.tsx`, `price-tag.tsx`, `saving-badge.tsx`, `header-counters.tsx`, `markdown.tsx`
- `lib\api\server-fetch.ts`, `lib\format\money.ts`, `lib\seo\json-ld.ts`, `lib\seo\metadata.ts`, `lib\cart\cart-store.ts`, `lib\markdown.ts`
- `playwright.config.ts`, `e2e\storefront-browse.spec.ts`, `e2e\slug-redirect.spec.ts`
Modify (web): `app\(storefront)\layout.tsx` (header/nav/footer/dock, `lang="vi"`, font), `app\(storefront)\page.tsx` (home), `package.json` (`markdown-it`, `@playwright/test`; scripts `e2e` = full suite against local dev stack, `e2e:smoke` = read-only subset with `BASE_URL` [RT#12])

## Implementation Steps

1. Spring public DTOs + `StorefrontQueryService` (published && ACTIVE for lists; product page also serves DISCONTINUED with flag) + `PublicPriceRedactor` applied in the mapper; `PublicPriceLeakIT` scaffold.
2. `SearchService` + suggest endpoint.
3. `server-fetch.ts` (base URL, `revalidate: 60`, REDIRECT handling, 404 -> `notFound()`, throw otherwise) + `error.tsx`.
4. Layout shell: header, mega category menu, nav bar with "Đại lý & Mua sỉ" (links to `/bao-gia` until phase 7 page exists), footer from public settings, dock, bubble.
5. Home (fixed blocks: banner text, trust strip, Nhóm hàng grid, Thương hiệu grid, one row of 5 cards per level-1 category with "Xem thêm sản phẩm").
6. Listing + brand pages, filters, sort, pagination, mobile sheets.
7. Product page + unit picker + sticky CTA + basket store + header counters.
8. Search page + header suggest.
9. SEO: metadata helpers, JSON-LD, sitemap (per request), robots; canonical rules: filtered/sorted listings canonical to the base URL, page > 1 canonical to itself.
10. Accessibility pass (design-guidelines s.3: focus ring, `aria-live` on price, radios for units, `prefers-reduced-motion`).
11. Playwright specs against the local dev Compose stack (`npm run e2e`).

## Tests

API:
- `StorefrontQueryServiceIT`: drafts and unpublished hidden; discontinued excluded from lists but product page returns `status=DISCONTINUED`; hidden SKUs excluded; level-1 listing includes child categories; brand/attribute/unit filters; price sort puts "Liên hệ" and hidden-price items last; card `fromPrice` uses active promo and ignores hidden-price SKUs; promo starting today is active without any job [RT#13]; history slug -> `{kind:"REDIRECT"}`.
- `PublicPriceLeakIT` [RT#4]: as described above; covers nav, settings, home, category, brand, product, search, suggest, sitemap in this phase.
- `PublicPriceRedactorTest`: every price field null and `priceVisible=false` for a hidden SKU; visible SKU untouched.
- `SearchServiceIT`: "giay rut day" finds "Giấy rút đáy Sen Vàng"; "svrd1280t" finds code `SVRĐ1280t`; "SV465-4L- Gói" exact code ranked first; tokens AND-ed; `%` and `_` treated literally.

Web (Vitest):
- `money.test.ts`: `428500` -> `428.500đ`; `1.9` -> `1,9%`; `0` -> `0đ`.
- `json-ld.test.ts`: one Product, `offers.length` = visible priced SKUs, `price` = effective price, `priceCurrency` `VND`, no `offers` when all SKUs are "Liên hệ"; `</script>` in a name escaped as `\u003c`.
- `cart-store.test.ts`: add same SKU merges qty; cap 9999 and 50 lines; corrupt JSON / `v:2` -> empty; quote and order lists independent.
- `server-fetch.test.ts` [RT#9]: 200 -> data; 404 -> `notFound()`; 500 and network error -> throws (never returns an empty result); fetch called with `next.revalidate = 60`.

Playwright (`apps/web/e2e`, run locally):
- `storefront-browse.spec.ts`: home -> category -> filter brand -> product -> select Thùng -> price, code and note change; add to quote -> dock/header count 1; 390 px viewport `scrollWidth == clientWidth` on all 5 page types.
- `slug-redirect.spec.ts`: rename product slug in admin -> old URL returns 308 to new URL.

## Success Criteria

- [ ] All routes render seeded data; layout matches `docs/wireframes/store-*.html` at 390 px and 1440 px.
- [ ] Saving and per-unit numbers equal phase-3 test values (SV6C Cây "Tiết kiệm 1,9%", SV320 Dây "Bằng giá mua lẻ").
- [ ] Admin price edit visible on the storefront within ~60 s [RT#13].
- [ ] Seeded flagged SKUs (SV465 Thùng `SV465-4L- T80`, Dây 8 `SV465-4L- G8`) show "Liên hệ" with no confirmation note; SV465 Gói keeps its price; the 175x120 napkin shows its prices (3.229đ / gói, 32.290đ / dây) [V4, D1].
- [ ] `PublicPriceLeakIT` green and fails when a new `/api/public/**` route is not registered.
- [ ] `npm run build` succeeds with the API stopped [RT#9].
- [ ] Rich Results Test / validator.schema.org: Product + BreadcrumbList valid on 3 sample pages (local tunnel or after phase 8 deploy).
- [ ] Lighthouse mobile (local prod build): Performance >= 85, Accessibility >= 95, SEO = 100 on home, listing, product.
- [ ] Vitest, API tests and local Playwright specs green.

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| Stale price shown after admin edit or promo boundary [RT#13] | M x L | Max ~60 s; server reprice and `PRICE_CHANGED` on submit (phase 6); documented to owner |
| Per-request rendering costs CPU on the 4 GB VPS [RT#9] | M x M | API reads are cheap and fetches cached 60 s; Cloudflare caches static assets; measured in phase 8 light-load check |
| `sitemap.ts`/`robots.ts`/`not-found` behaviour with two root layouts in Next 16 | M x M | Covered by phase-2 spike; fallback: route handlers `app/sitemap.xml/route.ts` |
| Hidden price leak through a new DTO or route [RT#4] | L x H | Single `PublicPriceRedactor`; `PublicPriceLeakIT` fails on any unregistered public route |
| Google treats multi-offer Product oddly | M x L | Validate before launch; fallback to `AggregateOffer` (low/high) |
| Wireframe CSS port drifts from Next component structure | M x L | Keep class names; compare screenshots side by side |

<!-- Updated: Validation Session 1 - success criterion for catalogue-flagged SKUs shown as "Liên hệ"; Session 3 (D1) - napkin priced -->

Rollback: storefront not public until phase 8; revert commits. No migrations in this phase.
