# Platform options: DNA Hoàng Nguyên catalogue + B2B web (phase 1)

Date: 2026-10-29 | Scope: spec sections A, B, C, E of `docs/feature-spec.md` | Rates: VND, excl. VAT unless noted
Pricing legend: **[V]** verified on official page or registry this session. **[U]** unverified (third-party, search snippet, or estimate).
FX assumption: 1 USD = 26,000 VND **[U]**.

## 1. Options

- **A.** Next.js (App Router) + Payload 3 (admin in same app) + Postgres, self-hosted on Vietnam VPS, Cloudflare free in front.
- **B.** Sapo Web (SaaS, the platform the reference site pinhongngoc.com runs on). Haravan not evaluated in depth: official pricing page 404.
- **C.** WordPress + WooCommerce + WooCommerce B2B & Wholesale Suite + one small custom plugin for Excel diff.

## 2. Fit vs spec (gaps in bold)

| # | Need (spec ref) | A custom | B Sapo Web | C WooCommerce |
|---|---|---|---|---|
| 1 | 2-level category tree + per-category attribute sets (B1) | Full | **Partial, attribute sets per category not seen** | Categories full; attribute sets via taxonomy/ACF plugin |
| 2 | Brands with pages + filter (B2, A4) | Full | Partial, unverified | Full (taxonomy) |
| 3 | Multiple unit variants, each own code + price (B3) | Full (sku table) | Full: variants with SKU [V: import matches by SKU]; "sản phẩm quy đổi" conversion-unit type exists [V] | Full (variations with SKU, price) |
| 4 | Auto đơn giá/gói + "tiết kiệm x%" (A19) | Full | **Not native; custom code, Liquid access unverified** | **Not native; custom snippet** |
| 5 | Excel import, preview diff by mã hàng (B4) | Full, ~1 pw | **Overwrite by SKU [V]; no preview diff seen** | **Native CSV importer has no diff; plugin needed** |
| 6 | Quote queue, status, assignee, export (B5) | Full | **No quote feature found; "Tư vấn" button only** | Full via B2B Suite request-a-quote [V] |
| 7 | COD + bank transfer + VietQR, no gateway (A9-A10) | Full (static EMV QR, no API) | COD/bank likely native [U]; VietQR needs code [U] | COD + BACS native; VietQR via plugin/code |
| 8 | Order price snapshot + discount lines (B6) | Full | Unverified | Native line-item price; discount lines via plugin |
| 9 | Customer-group price lists (phase 2, A18) | Full | Full [V: group price lists, % or fixed] | Full [V: B2B Suite, unlimited groups] |
| 10 | News 4 categories, blocks, SEO per page, JSON-LD, redirects (A12, A16, B7) | Full, custom | Basic blog; JSON-LD/redirect depth unverified | Full (SEO plugin + redirect plugin) |
| 11 | Mobile-first (bottom nav, sticky CTA, 2-col grid) (A15) | Full control | **Theme-limited** | Theme/builder dependent; custom CSS |
| 12 | Custom admin: 2 roles, price history, audit log (B3, B9) | Full (Payload access control, hooks) | **Fixed admin, roles/audit not verified as sufficient** | Roles native; price history/audit via plugin |
| 13 | Data ownership / lock-in | MIT code, Postgres dump | **High: proprietary; exit = Excel export** | GPL, MySQL dump |

Read-across: B covers 1-3, 9, 13 partly; fails or is unverified on 4-6, 11-12. C covers most natively, weak on 4-5. A covers all, but every item is build work.

## 3. Cost and effort (monthly VND)

| Option | Running cost /mo | Setup | Build (person-weeks) | Ongoing dev time |
|---|---|---|---|---|
| A: VN VPS (2 vCPU/4 GB class) + .vn domain + Cloudflare free | ~300k-650k VPS **[U]** + ~39k domain (470k/yr renewal [V, reseller table]) | none | **10-12** (estimate; one senior full-stack dev) | ~4-8 h/mo (estimate: patches, backups) |
| A-alt: Vercel Pro + external Postgres | ~520k (USD 20 [V]) + DB tier **[U]** + domain | none | 10-12 | similar, plus Vercel billing |
| B: Sapo Web Standard / Advanced | **499k / 600k [V]** | 1.5M / 2M, waived on contract of 2+ years [V] | 1-2 config + 1-3 workaround (estimate) | ~0 dev, operator-level |
| C: VN shared/VPS hosting + B2B Suite | ~150k-400k hosting **[U]** + ~323k plugin (USD 149/yr [V]) | none | 6-9 (estimate) | ~2-6 h/mo (plugin/WP updates) |

Annual: A ~4.5M-8.5M; B ~6.0M-7.2M (0 setup on 2-yr deal); C ~5.6M-8.6M. Costs are close; build labour decides the ranking, not hosting.

Pricing source notes:
- Sapo Web plans [V]: Web Standard 499k (1 website, 5 staff, 5 GB, unlimited products); Advanced 600k; Growth 999k; Enterprise by quote.
- Sapo .vn domain [V]: .vn 650k new / 470k renewal per year (effective 01/09/2024).
- Haravan [U]: official page 404. Third-party only: Omni Pro 680k/mo incl. website, 2 stores, 10 staff. Not verified.
- Vercel [V]: Pro USD 20/mo per dev seat; 1 TB bandwidth. Hobby is personal non-commercial only; a paid-for business site needs Pro.
- Cloudflare [V]: Workers Paid USD 5/mo; Free 100k req/day; R2 10 GB-month free.
- WooCommerce B2B & Wholesale Suite [V]: USD 149 for 1 year (USD 238.40 for 2 years); tiered pricing, request a quote, unlimited groups. Sites per license: not stated.
- WooCommerce core [V]: v11.2.1, 7M+ installs, requires WP 7.0.
- VN VPS [U]: Vietnix official page unreachable. Third-party: budget from 119k/mo (AZDIGI comparison, 14 Jul 2026); BASIC 7 at 621k/mo (whtop listing, specs not checked). Renewal may rise ~30% (Websiteplanet review).
- VN shared hosting [U]: Vietnix listings 42k-346k/mo (whtop).
- VietQR [V for absence of fee in API docs]: merchant API needs token + balance-sync setup, which is more than phase 1 needs. Static EMV QR (bank BIN + account + amount + content) can be generated locally with no API **[U, standard-based, not tested]**.

## 4. Licences and adoption risk

- **Payload** [V]: MIT, v3.92.1 (npm). Company-backed; v3 stable Nov 2024. Abandonment risk low-medium; MIT allows forking. Payload Cloud pricing conflicting, not used.
- **Next.js** [V]: 16.4.3, MIT. Very large community.
- **Directus** [V]: moved from BSL to MSCL with v12 (May 2026). Free for <50 employees and <USD 5M revenue. Licence changed twice; rejected for terms risk.
- **Strapi** [V]: Community Edition MIT; `ee/` directories under separate licence. Viable backup to Payload; admin customisation is more plugin-based.
- **Sapo** [U]: pricing has changed before (Sapo blog "thay đổi bảng giá"). Full lock-in.
- **WooCommerce** [V]: mature, GPL. Risk sits in third-party plugin maintenance and plugin conflicts (reference analysis flagged the same for B2B plugins).

## 5. Hosting and domain for Vietnam traffic

- **Latency:** Vercel's Singapore region is sin1 [V]. Vietnam to Singapore RTT is typically tens of ms **[U, not measured]**. Vietnam domestic origin would be lower **[U]**.
- **Cloudflare** has PoPs in Hanoi and Ho Chi Minh City [V, Cloudflare blog "ten new data centers"; city list from secondary source].
- **Recommended:** VN VPS origin (Docker: Next.js + Payload + Postgres, Caddy or Cloudflare SSL) + Cloudflare proxy for caching static assets and SSL. Backups: daily `pg_dump` + media to R2 (10 GB free) **[V]**.
- **Vercel:** simpler deploys but needs Pro (commercial), data sits in SG, and Payload needs external Postgres. Not recommended for phase 1 unless ops must be zero.
- **Domain:** .vn needs Vietnamese business registration documents **[U, not verified]**. Use a reputable registrar; quote prices above are a reseller table.

## 6. Recommendation (ranked)

1. **A: Next.js + Payload 3 + Postgres on VN VPS, Cloudflare in front.**
   - Reasons: only option covering all of spec (diff import, quote queue, per-unit savings, price snapshot, custom roles). MIT stack, no per-seat or SKU fees. Owns data. Runtime cost in the same band as B and C.
   - Costs: 10-12 person-weeks build; needs a developer retainer after launch.
2. **C: WooCommerce + B2B Suite + small import plugin.**
   - Reasons: fewer custom weeks (6-9), biggest dev pool in VN, quote and tiers already native. Weaker on mobile-first design and admin control, and depends on plugin health.
3. **B: Sapo Web Standard/Advanced.**
   - Reasons: lowest build and ops effort, fast launch, but 4-6 spec items unverified or missing, and full lock-in. Choose only if conditions below hold.

**When this recommendation is wrong:**
- No developer for ~3 months of build plus ongoing patches: choose **B**. A without a maintainer becomes a security liability.
- Launch needed in under ~6 weeks: choose **B**, and accept manual quotes (Zalo/phone) and manual per-unit text.
- Build budget capped under ~6 person-weeks: choose **C**.
- Operator must edit theme and content without code, and never needs quote diff or custom flows: choose **B** or **C**.
- KiotViet API sync or marketplace (Shopee/Lazada) needed in phase 1: re-evaluate; both A and C need much more work.

## 7. Limitations

- No prototype, no latency measurement from Vietnam, no security review.
- Sapo feature gaps (variant cap, Liquid/theme access, quote feature, COD/VietQR, price-list scheduling) are unverified; Sapo support must confirm before any B decision.
- Haravan official pricing and features not retrieved.
- Vietnix official VPS page not retrieved; VPS prices are third-party. Final plan needs a live check.
- VietQR static QR approach is from standard practice, not tested against VietQR docs.
- FX rate assumed; all VND figures move with it.
- Build estimates are judgement, not measured.

## Sources

- Sapo Web plans: https://www.sapo.vn/bang-gia-sapo-web.html
- Sapo price list: https://www.sapo.vn/cap-nhat-tinh-nang/quan-ly-bang-gia
- Sapo import template (overwrite by SKU, conversion units): https://www.sapo.vn/cap-nhat-tinh-nang/dieu-chinh-file-mau-nhap-san-pham
- Sapo .vn domain prices: https://www.sapo.vn/bang-gia-dang-ky-ten-mien.html
- Haravan third-party listing: https://quasa.io/vi/media/haravan-hay-sapo-hai-cua-hang-khien-gia-niem-yet-chua-noi-het
- Payload licence: https://github.com/payloadcms/payload/blob/main/LICENSE.md
- Payload npm: https://registry.npmjs.org/payload/latest
- Next.js npm: https://registry.npmjs.org/next/latest
- Directus v12 licence: https://directus.com/resources/directus-v12-license-change
- Strapi licence: https://raw.githubusercontent.com/strapi/strapi/develop/LICENSE
- Vercel pricing: https://vercel.com/pricing
- Vercel fair use / commercial: https://vercel.com/docs/limits/fair-use-guidelines
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare data centres: https://blog.cloudflare.com/ten-new-data-centers/
- WooCommerce B2B & Wholesale Suite: https://woocommerce.com/products/b2b-wholesale-suite/
- WooCommerce on WordPress.org: https://wordpress.org/plugins/woocommerce/
- VietQR API workflow: https://api.vietqr.vn/en/vn/overview/description-of-vietqr-api-workflow
- VN VPS (third-party): https://azdigi.com/blog/kien-thuc-vps/top-7-reliable-vps-providers-in-vietnam/?lang=en ; https://www.whtop.com/plans/vietnix.vn/124615

## Unresolved questions

- Sapo: max variants per product; Liquid/theme access; quote (báo giá) feature; COD/bank/VietQR support; price-list date scheduling; contract terms if 2-year commitment.
- Haravan: current official plans and whether Excel import and variants match Sapo.
- Who builds and maintains (developer named? budget? retainer hours/month?).
- Launch date target and budget ceiling (feeds the "wrong when" conditions).
- Vietnix or other VN provider: final VPS spec and live price.
- Does DNA need the .vn domain registered under company name now (registrant documents)?
- Phase 1 quote channel (Zalo OA vs email) changes notification build effort.

Status: DONE_WITH_CONCERNS
Summary: Ranked A (Payload 3 + Next.js on VN VPS) first for full spec fit, C (WooCommerce + B2B Suite) second as cheaper custom path, B (Sapo Web) third as fastest, low-maintenance fallback if no developer or short deadline. Core SaaS feature claims and Haravan pricing are unverified.
Concerns/Blockers: Sapo and Haravan feature gaps and Haravan pricing could not be fully verified (Haravan page 404); VN VPS prices from third-party sources only; no prototype or latency test; FX rate assumed.
