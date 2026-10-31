# MVP scope, ownership and rules (agents read this first)

Written 2026-10-31 13:5x by the lead. Owner is away ~2 h (back ~15:45 local, Asia/Bangkok) and wants a **runnable MVP on Docker**. Lead decides scope. Full plan stays in `plan.md` + `phase-0x-*.md`; this file only says what is IN/OUT now and who owns what.

## Goal

`docker compose -f deploy/compose.yml up -d --build` then open `http://localhost:8000`:
storefront (catalogue of 32 products / 69 SKUs, unit picker, quote + order basket, quote/order submit, order lookup, bank text then VietQR after staff confirm) and `/admin` (login, product list + price edit, quote/order queue with status flow, bank review, bank settings). Mail goes to Mailpit (`http://localhost:8025`).

## Scope (what to build)

| Plan phase | MVP slice | Cut for now (report as cut) |
|---|---|---|
| 2 Foundation | Boot API, Flyway, session login + CSRF spa + problem JSON, bootstrap MANAGER from env, audit, settings, login throttle, per-request session re-check, Next scaffold, compose | CI workflow, `docs/code-standards.md` spike notes |
| 3 Catalogue | category (2 levels), brand, product, sku, price_history, seed 69 SKUs from CSV, admin product list + editor (SKU table, price/visibility/flag edits, publish), admin category/brand list + quick create | images upload/pipeline (placeholder only, `product.image_url` nullable), slug history + redirects, attribute sets/filters, brand merge/delete, bulk ops, product merge/duplicate, KiotViet fields |
| 5 Storefront | home, category listing (brand filter, sort, paging), brand page, product page (unit picker, saving badge, promo display), search + suggest, header/nav/footer/dock, localStorage baskets, SEO basics (metadata, JSON-LD, sitemap, robots), `PublicPriceRedactor` | Playwright e2e suite, Lighthouse, contact bubble polish |
| 6 Quote/Order | pricing service (server reprice), quote submit, order submit (COD/BANK), idempotency, honeypot, per-IP limit, lookup, order page, VietQR (`emvco.ts`), admin queue + detail + transitions (confirm with shipping fee, mark paid, KiotViet code, ship, complete, cancel), email via Mailpit, SePay webhook + matcher + REVIEW queue (priority 2 in be-sales) | Turnstile (flag off, no widget), Excel/print exports, `/bang-gia` price list, contact form, reissue-amount, line edit after submit, reconcile job |
| 7 Content/Settings | public settings, admin bank settings (MANAGER, password re-entry, email alert), 3 static policy pages (Giới thiệu, Chính sách, Liên hệ) hardcoded in Next | news/posts, pages CMS, home blocks, discount-tier admin UI (tiers stay in `app_setting`, empty = off) |
| 4 KiotViet import | CUT entirely (needs the owner's real export; not launch-blocking per plan) | all |
| 8 Hardening/Deploy | Dockerfiles, compose (db, api, web, caddy, mailpit), Caddyfile, `.env.example`, smoke script, backup script (`pg_dump` to volume), runbook (`docs/deployment-guide.md`) incl. SQL account runbook | Cloudflare AOP, R2, healthchecks.io, `deploy.sh` auto-revert, restore drill |

Tests: unit tests (pure logic) are mandatory; integration tests with Testcontainers are welcome where cheap (Docker Desktop runs). No mocks/fake data to make a check pass.

## Stack (versions verified on Maven Central / npm)

Java 21, Spring Boot **4.1.2**, PostgreSQL 18, Flyway, Maven. Node 24, Next **16.4.3**, React **19.3.1**, antd **6.6.8** (admin only), TanStack Query (admin), plain CSS for storefront (port `docs/wireframes/assets/storefront.css`), `qrcode` for VietQR SVG.
API base package `vn.dnahoangnguyen.api`. Layout (from phase 2): `apps/api`, `apps/web`, `deploy/`, `docs/`, `scripts/`.

## Topology (Docker)

```
browser :8000 -> caddy -> /api/*  -> api:8080 (Spring)      header_up CF-Connecting-IP {remote_host}
                       -> /uploads/* -> file_server
                       -> /*      -> web:3000 (Next standalone)
web (server side) -> http://api:8080 (env API_INTERNAL_URL)
api -> db:5432 (postgres:18), api -> mailpit:1025
```
Browser calls are same-origin `/api/...` (cookie `DNA_SESSION`, header `X-XSRF-TOKEN` from cookie `XSRF-TOKEN`). No CORS.
Host ports owned by the lead's integration stack: 8000 (caddy), 8025 (mailpit UI). Do NOT bind 8000/8025/8080/3000/5432 from your own containers; use Testcontainers or `127.0.0.1:0` style random ports and a unique compose project name.

## Contract

`D:\dna-web\docs\api-contract-mvp.md` is the single source of truth for request/response shapes (TypeScript-style interfaces). FE and BE both conform. If you must deviate, change the contract file in your branch (small, targeted edit) and say so in your report. Money = integer VND. Vietnamese `detail` in problem responses. Status enums are upper-case strings.

## Ownership (do not edit files you do not own)

| Agent | Owns |
|---|---|
| be-foundation | `apps/api/pom.xml`, `ApiApplication`, `common/**`, `admin/**` (user, audit, auth), `settings/**`, `notify/**` (port + log adapter), `application*.yml`, migrations V1-V13 (V10-V13 = catalogue schema, written in the kernel so every BE branch can compile and test against it) |
| be-catalogue | `catalog/**`, `storefront/**`, `config/catalogue.yml`, migrations V14-V19 (additive only), seed loader, catalogue tests |
| be-sales | `sales/**` (pricing, quote, order, public + admin controllers, `sales/notify/EmailNotificationAdapter`, `sales/bank/**`), `config/sales.yml`, migrations V40-V49 |
| data | `apps/api/src/main/resources/seed/catalogue-2026.csv` |
| infra | `deploy/**`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `.dockerignore` files, `scripts/**`, `docs/deployment-guide.md` |
| fe-store-a | storefront layout, home, listing, brand, product, search, SEO, baskets, header counters, `app/(storefront)/storefront.css` |
| fe-store-b | `/bao-gia`, `/gio-hang`, `/don-hang/[code]`, `/tra-cuu-don`, static pages, `lib/vietqr/**`, forms, order components |
| fe-admin-a | admin shell/login/session, products + categories + brands screens, `proxy.ts`, `lib/admin/**` except requests/settings |
| fe-admin-b | admin requests/orders/quotes/bank review/settings screens and their `lib/admin/*-api.ts` |

Shared FE files (`apps/web/package.json`, `tsconfig.json`, `next.config.ts`, `lib/api/*`, `lib/format/*`, `lib/cart/cart-store.ts`, `app/layout`s) are written by the lead in the scaffold. Do not edit them; if one is wrong or missing something, say so in your report (or make the smallest possible edit and list it).
Extra dependencies: avoid. If a package is truly needed, add it in your branch and list it in your report (lead regenerates the lockfile at merge).

## Rules

- Windows 10 host; shells are PowerShell and Git Bash. Use absolute paths. Do not prefix commands with `cd`.
- Work in your own git worktree/branch (when you have one). Commit to that branch with conventional commits, no AI/Claude mention, no plan/finding IDs (RT#, V4, W2, C13...) in code, comments, test names or commit messages. Never push. Never touch `main` or other branches.
- Match existing code style; keep comments sparse and meaningful. Vietnamese UI copy per `docs/design-guidelines.md` (short, polite, `428.500đ`, `1,9%`).
- No secrets in git. Dev credentials live in `deploy/.env` (gitignored) and `deploy/.env.example`.
- YAGNI. Do not add features beyond the slice above. Do not leave stubs that return fake data.
- Build/test commands: API `mvn -B -f apps/api/pom.xml test` (Maven + JDK 21 are on PATH); web `npm run build`, `npm test` inside `apps/web` (run `npm ci` or `npm install` once in your worktree).
- Hard deadline for your final report: stated in your task prompt (absolute local time). Ship a working smaller slice rather than a broken bigger one. When time is short, stop adding scope, make everything you have compile/test green, commit, report.
- Final report format: `Status: DONE | DONE_WITH_CONCERNS | BLOCKED`, 3-6 line summary, files owned that you changed, what you cut, deviations from the contract, how you verified (commands + results), open problems.
