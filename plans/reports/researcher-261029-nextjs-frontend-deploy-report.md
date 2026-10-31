# Research: Next.js FE + /admin, Spring Boot API, 1 VPS VN + Cloudflare
Date: 2026-10-29. Scope: FE framework, admin UI, auth, SEO, VietQR, deploy, spam, tests.
Legend: [V] verified from official source/registry today. [U] unverified (reason given). [K] from knowledge, not fetched.

## 1. Versions and caching/revalidation

**Decision:** Next.js 16 (npm latest `16.4.3`, engines `node >=20.9.0`), React 19 (`19.3.1`). Catalogue pages use fetch with tags. Spring Boot calls a secured Route Handler that runs `revalidateTag(tag, { expire: 0 })`.

- [V] npm `next@latest` = 16.4.3; `react@latest` = 19.3.1. https://registry.npmjs.org/next/latest
- [V] `revalidateTag(tag, profile)` two-arg form. Single-arg form deprecated. `profile="max"` = stale-while-revalidate. `{ expire: 0 }` = next request blocks until fresh. Callable in Server Functions and Route Handlers, not in Proxy or Client. https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- [V] `updateTag` is for Server Actions only. External Spring Boot caller must use `revalidateTag(tag, { expire: 0 })`. Same page.
- [V] Tags assigned via `fetch(url, { next: { tags: ['product:123','catalogue'] } })`. Same page.
- Why `{expire:0}` not `max`: with `max`, the first visitor after an admin edit sees the old price once. At ~69 SKUs one blocking refetch per edit is cheap.
- Pattern: Spring Boot after-commit -> `POST /api/revalidate` (shared secret header, Docker network only) with `{tags:[...]}` -> Route Handler loops tags -> `revalidateTag(t, {expire:0})`. Tag scheme: `product:{id}`, `catalogue`, `sitemap`.
- [V] Proxy does not do data fetching; `options.next.tags` has no effect there. https://nextjs.org/docs/app/getting-started/proxy

---

## 2. Admin UI library

**Decision (rank 1): Ant Design 6 (`antd@6.6.8`) for /admin only.** Layout, Menu, Table (sort/filter/pagination built in), Form (validation rules), Modal and Select cover KiotViet-style screens with least code. Keep TanStack Query `5.105.0` for fetch/mutate/invalidate. Skip TanStack Table and RHF+Zod on the admin side (YAGNI).

1. **antd 6.6.8** (peer react >=18). Pros: one dependency covers table, form, modal, layout; vi_VN locale built in. Cons: heavy bundle, own theme system (token `colorPrimary` for KiotViet blue). Bundle lives only in the admin group.
2. **Mantine 9.7.4** (peer react ^19.2). Good forms and modals. Gap [K]: no filter-column table out of the box, so an extra table package is needed. Runner-up.
3. **shadcn 4.23.0 + TanStack Table 9.3.1 + RHF 7.91.0 + Zod 4.6.7.** Most control, most code: you assemble Table, Dialog, Form and Select yourself. Only if a shared design system is required (not in brief).

- [V] Registry versions: `antd@6.6.8`, `@mantine/core@9.7.4`, `shadcn@4.23.0`, `@tanstack/react-table@9.3.1`, `@tanstack/react-query@5.105.0`, `react-hook-form@7.91.0`, `zod@4.6.7`, `tailwindcss@4.3.3`. https://registry.npmjs.org/antd/latest
- [V] antd i18n: `import viVN from 'antd/locale/vi_VN'`, `<ConfigProvider locale={viVN}>`. https://ant.design/docs/react/i18n
- [V] Route groups `(admin)` / `(storefront)` do not change URLs. Each group can have its own root layout (`<html>`/`<body>`). Moving between root layouts = full page reload (acceptable: admin is a separate tool). Same-path conflicts across groups error. https://nextjs.org/docs/app/api-reference/file-conventions/route-groups (lastUpdated 2025-06-16; not re-checked for 16.x)
- Bundle isolation: storefront root layout imports Tailwind CSS only; admin root layout imports antd and ConfigProvider only. Never import admin components from a shared layout.
- [U] antd bundle size and Tailwind preflight vs antd CSS clash not measured. Spike in build step 1.

---

## 3. Auth wiring, /admin guard, CSRF

**Decision: same-origin, Spring owns the session.** Spring Security issues an HttpOnly session cookie. Browser calls `/api/*` on the public host. Caddy routes `/api/*` to `api:8080` on the Docker network. Spring is never published on a host port. Next Server Components call `http://api:8080` directly for SSR data.

1. **Caddy path routing: `/api/*` -> Spring, `/*` -> Next.** Cookie is same-origin, no CORS. Large uploads (Excel import, images) bypass Next, avoiding proxy body-size questions. Cost: one Caddyfile block. Recommended.
2. **Next `rewrites` `/api/:path*` -> `http://api:8080`.** Same cookie behaviour. Extra hop; proxied upload body limits [U: not tested, try a 10 MB file]. Fallback if one entry point is wanted.
3. **Next-owned session (jose/iron-session) + Spring trusts internal secret.** Two session stores, duplicated authz. Reject (YAGNI).
4. **JWT in localStorage calling Spring cross-origin.** XSS exposure plus CORS. Reject.

- [V] Proxy file is `proxy.ts` (named `proxy` or default export). Middleware is renamed Proxy in Next 16, same behaviour. Runs on Node.js runtime. Use `matcher`. https://nextjs.org/docs/app/getting-started/proxy and https://nextjs.org/docs/app/guides/authentication
- [V] Proxy = optimistic cookie-presence check only. Auth guide: do not rely on proxy alone. Admin guard = proxy redirect to `/admin/login` when the cookie is missing + DAL `verifySession()` in admin Server Components + Spring 401/403 as the real gate.
- [V] Layouts do not re-run on navigation: do auth in pages and DAL, not layouts. Server Actions and Route Handlers need their own checks. https://nextjs.org/docs/app/guides/authentication
- [V] Server Components should fetch from the source directly, not through own Route Handlers (extra round trip). https://nextjs.org/docs/app/guides/backend-for-frontend
- [V] Cookie options (auth guide): `httpOnly`, `secure`, `sameSite: 'lax'`, `path: '/'`, set server-side.
- CSRF: `SameSite=Lax` + same-origin blocks most cross-site POSTs. Add Spring Security CSRF with `CookieCsrfTokenRepository` (XSRF-TOKEN readable, header `X-XSRF-TOKEN` on admin mutations) [K: Spring Security docs not fetched]. Next Server Actions Origin check [U: not in fetched pages].
- Forward the `Cookie` header to Spring only for logged-in admin SSR. Guest catalogue SSR is anonymous.

---

## 4. SEO: metadata, sitemap, JSON-LD, slugs, redirects

**Decision:** One Product page per catalogue item (not per pack). One `Product` JSON-LD with an `offers` array of `Offer` (one per Goi/Day/Thung, `priceCurrency: "VND"`). Slugs generated once, stored unique, old slugs kept for 301s.

- [V] JSON-LD: `<script type="application/ld+json">` in a Server Component with `JSON.stringify(x).replace(/</g,'\\u003c')` for XSS. https://nextjs.org/docs/app/guides/json-ld (lastUpdated 2026-03-02)
- [V] Sitemap, robots, opengraph-image are file conventions (listed in BFF doc). `sitemap.ts`/`robots.ts` exact API not fetched [U]. `generateMetadata` for title, description, canonical, OG. Set `metadataBase` to production domain.
- [V] Google: Product snippets "suit pages where buyers can't purchase"; merchant listings suit pages that sell directly. This site is quote/order: target **Product snippet**. https://developers.google.com/search/docs/appearance/structured-data/product (lastUpdated 2025-12-10)
- [U] Google page did not confirm: `offers` as an array under one Product, AggregateOffer for ranges, price must equal visible price. Standard schema.org practice; check with Rich Results Test and https://validator.schema.org/ before launch.
- Pack (Goi/Day/Thung) = Offer, not a separate Product, unless the pack is a different item.
- Slugs [K, JS/Unicode behaviour]: `normalize('NFD')` and strip combining marks U+0300-U+036F to remove tones. `đ`/`Đ` (U+0111/U+0110) have no decomposition, so map them to `d`/`D` first. Then lowercase, replace `[^a-z0-9]+` with `-`, trim `-`. Generate once at create; do not regenerate on name edit. Unique DB index.
- Slug change: table `product_slug_history(old_slug, product_id)`. Catch-all `app/san-pham/[slug]/page.tsx` looks up history and calls `permanentRedirect()` (named in BFF doc). Do not put per-product redirects in `next.config` (static only). Status code [K].
- Sitemap: `app/sitemap.ts` fetched from API, tagged `sitemap`, revalidated by the Section 1 webhook. `robots.ts` disallows `/admin` and `/api`.

---

## 5. VietQR static QR

**Decision (rank 1): build the EMVCo payload yourself (pure function, ~60 lines, CRC-16) and render it with `qrcode@1.5.4` (MIT, 2 small deps) on the server as SVG/PNG.** No runtime call to any VietQR host. Show account, amount and transfer content as text beside the QR as fallback.

1. **Own payload + `qrcode`.** No external dependency; survives VietQR changes. Cost: you own spec details; test in real bank apps before launch.
2. **`vietqr` npm `1.1.9`** (MIT, repo `vietqr/vietqr-node`, dep `axios`). Registry readme is empty, behaviour unverified. Description says it builds link URLs; demo links hit `api.vietqr.io`, an online API path. Reject for static QR.
3. **`img.vietqr.io` image URL.** Simplest (one `<img>`), but no official reference found this run. Parameter names come only from third-party tutorials. Official `api.vietqr.io` reportedly needs an `x-api-key` header [third-party summary, not fetched]. Reject: unverified contract, third-party uptime, account data sent to a third party on every view.

EMVCo/NAPAS payload [K, not fetched; verify against NAPAS VietQR spec before build]:
- Tags: `00`=`01`; `01`=`11` (static) or `12` (dynamic); `38` merchant account (`00` GUID `A000000727`; `01` bank BIN 6 digits + account; `02` `QRIBFTTA`); `52`=`0000`; `53`=`704` (VND); `54` amount (omit if static); `58`=`VN`; `59` account name; `60` city; `62` sub `08` transfer content.
- `63` = CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) over everything including `6304`, 4 uppercase hex.
- Test: check CRC against a known-good sample from a reputable source; scan in 2 banking apps.
- Store bank BIN and account in admin settings. No hard-coded bank list (YAGNI).

Unverified: GUID value, field lengths, static vs dynamic choice (owner decides). Sources checked: vietqr.io doc URL returned 404; WebSearch found only third-party pages (https://viblo.asia/p/vanilla-js-tao-ma-qr-voi-vietqr-vlZL95XZLQK, https://www.npmjs.com/package/vietqr, https://github.com/vietqr-io/vietqr-api).

---

## 6. Deploy on one 4 GB VPS

**Decision:** Docker Compose with 4 services: `caddy` (only published ports 80/443), `web` (Next.js standalone), `api` (Spring Boot), `db` (Postgres). `api` and `db` on internal network only. Cloudflare proxied; SSL "Full (strict)" with origin certificate on Caddy [U: Caddy/Cloudflare docs not fetched].

| Service | Limit (estimate) | Setting |
|---|---|---|
| caddy | 64 MB | default |
| web | 512 MB | `NODE_OPTIONS=--max-old-space-size=384` |
| api | 896 MB | `-Xmx512m -XX:MaxMetaspaceSize=160m` |
| db | 768 MB | `shared_buffers=256MB`, `effective_cache_size=1GB`, `max_connections=30`, `work_mem=8MB` |
| host OS | ~0.5 GB | 2 GB swap as safety |

Measure with `docker stats` under load; limits above are estimates.
- `shared_buffers` at 25% of RAM (1 GB) is too high beside a JVM; 256 MB is the right order [K].
- `deploy.resources.limits.memory` in Compose and Next `output: 'standalone'` [U: docs.docker.com and Next config not fetched; standard usage].
- [V] Cloudflare Free plan: 10 Cache Rules. https://developers.cloudflare.com/cache/how-to/cache-rules/ (lastUpdated 2026-08-14). Planned: (1) `/_next/static/*` cache eligible, long Edge TTL (hashed names). (2) `/uploads/*` cache eligible, Edge TTL 30 d, browser TTL 7 d; rename files on replace. (3) `/api/*`, `/admin/*`, HTML: no rule. Default HTML caching: [U] verify via `cf-cache-status` header after deploy.
- Backups: cron sidecar `pg_dump -Fc` daily + `rclone copy` of uploads and dumps to offsite bucket (Cloudflare R2 or Backblaze B2; pricing not checked [U]). Keep 14 daily. Monthly restore test into scratch container.
- CI (GitHub Actions, minimal): `api` job `./gradlew build` (Postgres via Testcontainers). `web` job `npm ci && npm run lint && npm test && npm run build`. On `main` only: build images, push to GHCR, SSH to VPS, `docker compose pull && up -d`. Rollback = previous image tag. Secrets in GitHub only.
- Rank: (1) Compose + Caddy. (2) Compose + nginx: more config, same result. (3) k3s: reject, YAGNI for one VPS.

---

## 7. Spam protection, cart, order code

**Decision:** Guest checkout (spec A9, no accounts). Cart in localStorage. Spam: honeypot + submit-time check + Spring per-IP rate limit + Turnstile on quote/order submit only.

1. **Layered: honeypot + min fill time (~3 s) + rate limit + Turnstile.** Turnstile siteverify: `POST https://challenges.cloudflare.com/turnstile/v0/siteverify` with `secret`, `response`, optional `remoteip`, `idempotency_key`. Tokens single-use, expire 300 s; reuse fails with `timeout-or-duplicate`. [V] https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ (lastUpdated 2026-10-22). Turnstile is free [K].
2. **Turnstile only.** Adequate, but solved-once tokens still allow spam bursts. Base layer of rank 1.
3. **Image CAPTCHA.** Reject: worse on mobile, the main use case.
- Rate limit by client IP. Behind Cloudflare, use `CF-Connecting-IP` only if Caddy accepts traffic from Cloudflare ranges only [U]; otherwise the limit sees Cloudflare IPs.

Cart:
1. **localStorage** `{v:1, items:[{sku, pack, qty}]}`. No server state, no cleanup job. Read in a client effect to avoid hydration mismatch [K].
2. **Server cart keyed by cookie.** Extra table and cleanup for no benefit with 1-2 admins. Reject.
- Server recomputes prices and value discounts (spec A21) on submit. Never trust client prices. Cross-device cart is not in spec (YAGNI).

Order code: `DNA` + 6 random Crockford base32 chars (no I, L, O, U). Unique index, retry on collision. Non-sequential, not enumerable. Lookup (A11) = phone + code. Transfer content (A10) must be alphanumeric, no diacritics, short; per-bank max length [U: check with 2 banks].

---

## 8. Test tools

**Decision:** Vitest for logic, Playwright for 3 smoke flows, JUnit + Testcontainers Postgres for API. Nothing else (YAGNI).

- [V] Node: Next 16 needs `>=20.9.0`; Vitest 5.0.5 needs `^22.12.0 || ^24.0.0 || >=26`. Use Node 22 or 24 in CI and in the image.
- Vitest `5.0.5` [V registry]: VietQR payload and CRC, slug helper, price/discount function, zod quote validation.
- Playwright `1.64.1` [V registry, engines `>=20`]: (a) browse -> cart -> submit quote; (b) admin edits price -> storefront shows new price (tests Section 1 revalidation); (c) order -> confirmation shows code. Turnstile test keys [U: not checked].
- JUnit + Testcontainers for Spring [K, not fetched].

---

## Unresolved questions and limits

1. Owner accepts Next 16 (current per npm) and Node 22/24 LTS for the server image?
2. VietQR: static (`11`) or dynamic (`12`) payload? Owner's bank BIN and account? Official vietqr.io/NAPAS spec NOT reached; tags and GUID in Section 5 are from knowledge. Verify before build.
3. Next `rewrites` body limits and cookie pass-through: not tested. Caddy routing (Section 3) avoids it.
4. Spring Security CSRF config and Next Server Actions Origin check: not fetched.
5. Not checked: Docker Compose memory keys, Caddy and Cloudflare origin cert, Postgres and Java LTS versions, Spring Boot line, Cloudflare HTML caching default. Budget: 12 WebFetch calls, 2 failed (Google ECONNRESET, retried; vietqr.io 404).
6. Google rules for multiple Offer objects and price-match: not confirmed by fetched page.
7. Spike before build: antd bundle size in admin group; Tailwind vs antd CSS interaction.
8. Quote/order notification channel (Zalo, email, both) is open in feature-spec line 132. Does not change this stack.
9. Bank transfer-content length and allowed characters: verify with two Vietnamese banks.
10. Confirm Caddy accepts only Cloudflare IP ranges before trusting `CF-Connecting-IP` for rate limiting.
