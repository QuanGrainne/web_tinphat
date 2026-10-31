---
title: "DNA web phase 1"
description: "Catalogue + quote/order web for DNA Hoang Nguyen: Next.js 16 + Spring Boot 4.1 + Postgres 18, KiotViet Excel sync, SePay bank webhook, VPS deploy"
status: in-progress
priority: P1
effort: "15.5-20 person-weeks (estimate)"
branch: "main"
tags: [nextjs, spring-boot, postgres, kiotviet, ecommerce, sepay, phase-1]
blockedBy: []
blocks: []
created: "2026-10-29T12:57:58.994Z"
createdBy: "ck:plan"
source: skill
---

# DNA web phase 1

## Overview

Goal: ship spec A1-A16, A19-A21 and B1-B9 (`docs/feature-spec.md`) minus section D "không làm" and the owner cuts of 2026-10-29/30 (no admin dashboard, audit-log viewer or users screen; A21 ladder without progress bar). Public catalogue with per-unit prices, quote cart, COD/transfer orders with dynamic VietQR after staff confirmation, SePay bank webhook that auto-marks exact-match transfers PAID, hand-built KiotViet-style admin, KiotViet Excel sync with preview diff. Admin is fully hand-built (no CMS), so admin screens dominate effort. Red-team changes are tagged `[RT#n]`, validation answers `[V#n]` (session 1), `[W1]`/`[W2]` (session 2) and `[D1]`/`[D2]` (session 3) in phase files (plan docs only, never in code).

## Decisions (locked; red team + Validation Sessions 1-3 included)

| Area | Decision | Source |
|---|---|---|
| Stack | Next.js 16.4.3 + React 19.3.1 (Node 24), Spring Boot 4.1.2 on **Java 21**, PostgreSQL 18, Flyway + Hibernate via Boot BOM | [BE report](../reports/researcher-261029-spring-boot-backend-report.md) s.1, [FE report](../reports/researcher-261029-nextjs-frontend-deploy-report.md) s.1, `docs/tech-stack.md` |
| Backend | 1 Maven module, package-by-feature, record DTOs, RFC 9457 ProblemDetail, form login + HttpSession, `csrf.spa()`, bcrypt, roles EDITOR/MANAGER + system actor `BANK_WEBHOOK` [W2], hand-written `price_history`/`audit_log`, POI 6.0.0 (fallback 5.5.1), `import_batch` JSONB + `@Version`, money = bigint VND, images on disk + rclone to R2, Thumbnailator JPEG/PNG, Testcontainers (no H2); no server PDF library (print CSS) [V6] | BE report s.2-7 |
| Auth | Progressive login delay keyed on (username, IP), in-memory (restart clears), one identical 401 body; per-request session re-check + idle 4 h / absolute 12 h; bank settings MANAGER-only, bank and owner-email change need password + email alert (owner-confirmed [V5]); **PAID: RT#6 amended by owner decision W2: PAID may be set by MANAGER or by the authenticated exact-match webhook**; **one MANAGER account at launch (bootstrap from env), no backup; EDITOR role kept, unused** (owner accepted risk, recovery needs server access) [V3]; no users screen, accounts managed by SQL runbook [D2] | Red team #2, #3, #6; Validation S1-S3 |
| Frontend | One Next app, `(storefront)` + `(admin)` root layouts, antd 6 vi_VN + TanStack Query for admin, plain CSS ported from wireframes for storefront, `proxy.ts` cookie check, request-time rendering + `fetch` `revalidate: 60` (prices may lag ~60 s, orders repriced on submit), JSON-LD Product + offers[], slug history + `permanentRedirect`, own EMVCo VietQR + `qrcode` (QR with amount only after staff confirm the total; before that account + content text only), localStorage carts, server reprices, order code `DNA`+6 Crockford, order page by code + phone (no link token) | FE report s.1-7; red team #5, #9, #13; [V2] |
| Payments | **W1:** SePay bank-notification webhook (notifier; money stays in the company account) + own EMVCo QR; Casso = fallback if SePay does not support the owner's bank; payOS rejected (gateway; conflicts with on-page QR and spec D). Spec D reading: a notifier webhook is allowed, a money-holding gateway is not. **W2 (policy A):** exact match (code in content + amount = total + configured account + direction in + BANK_TRANSFER order in CONFIRMED) -> system sets PAID, audit actor `BANK_WEBHOOK`; anything else -> REVIEW queue, never changes order state; manual MANAGER "Đã nhận tiền" stays as fallback. Persist-first, idempotent per vendor transaction id, reconcile job every 30 min over 48 h. Design: P6 "Bank webhook" | [Webhook report](../reports/researcher-261029-bank-webhook-services-report.md) s.2, s.5, s.6; Validation S2 |
| Import | Fixed rules (no options matrix), single write path shared with the editor, new codes hidden for review, reactivation restores only auto-hidden items; KiotViet name change updates SKU/unit name only, product display name stays web-owned [V7]; launch catalogue comes from a hand-built seed CSV | Red team #10, #14; Validation S1 |
| Deploy | Compose: caddy (`/api/*`->api, `/*`->web), web, api, db; 4 GB VPS; Cloudflare Free + Authenticated Origin Pulls (no IP lists); daily `pg_dump -Fc` + uploads to private R2, lifecycle retention, healthchecks.io (backups + bank reconcile job); CI = build + test; manual `deploy.sh` over SSH with auto-revert | FE report s.6, BE report s.8; red team #1, #11, #12 |
| Product | Public prices + per-SKU "Hiện giá/Liên hệ" (redacted in one place for every public output); only the 2 SV465 packing SKUs (`SV465-4L- T80`, `SV465-4L- G8`) seeded "Liên hệ" + admin-only `needs_confirmation` [V4, D1]; 175x120 napkin seeded priced; price-mismatch warning 2%, both directions [V1]; no shipping fee on web (staff enter it); discount ladder empty = off, applied server-side after promo as one `discount_total` + `discount_note`; optional promo price per SKU (read-time); saving badge > 0 else "Bằng giá mua lẻ"; KiotViet master for code/name/unit/conversion/price, web owns images/descriptions/categories/brands/SEO/visibility; Excel only, no API; no stock, customer accounts or payment gateway (notifier webhook is not a gateway [W1]); email notification for new orders/quotes | `docs/requirements-decisions.md`, [KiotViet report](../reports/researcher-261029-kiotviet-excel-api-report.md) s.4; red team #4, #6 |
| Platform | Custom build chosen over Payload/Woo/Sapo by owner | [Platform report](../reports/researcher-261029-platform-stack-options-report.md) |
| Admin scope | No dashboard, no audit-log viewer (`audit_log` still written; price history in editor, order history tab); `/admin` opens the product list; **no users screen** (deferred, D2: bootstrap MANAGER + SQL runbook); product editor = large KiotViet-style modal | Owner decisions A-C 2026-10-29, D2 2026-10-30 |

## Phases (effort = estimate, person-weeks, one senior full-stack dev)

| Phase | Name | Effort | Depends on | Status |
|---|---|---|---|---|
| 1 | [Spec and wireframe alignment](./phase-01-spec-and-wireframe-alignment.md) | 0.3 | - | Done (owner review pending) |
| 2 | [Foundation](./phase-02-foundation.md) | 1.75-2.25 | - | MVP slice done 2026-10-31 (CI workflow and spike notes cut) |
| 3 | [Catalogue domain and admin core](./phase-03-catalogue-domain-and-admin-core.md) | 3.5-4.5 | 1, 2 | MVP slice done 2026-10-31 (images, slug history, bulk ops, attribute sets cut) |
| 4 | [KiotViet Excel import](./phase-04-kiotviet-excel-import.md) | 1.25-1.75 | 3, 6 + real export (not launch-blocking) | Not started (cut from the MVP) |
| 5 | [Storefront](./phase-05-storefront.md) | 2.25-2.75 | 3 | MVP slice done 2026-10-31 (e2e suite beyond the walkthrough, Lighthouse, slug redirects cut) |
| 6 | [Quote and order](./phase-06-quote-and-order.md) | 4-5.25 | 5 | MVP slice done 2026-10-31 (Turnstile, exports, price list, contact form, reissue, reconcile job cut) |
| 7 | [Content and settings](./phase-07-content-and-settings.md) | 1.0-1.25 | 5, 6 | Partly done 2026-10-31 (bank settings + 3 static pages; news, pages CMS, home blocks, discount-tier editor cut) |
| 8 | [Hardening and deploy](./phase-08-hardening-and-deploy.md) | 1.5-2 | 1-3, 5-7 | Partly done 2026-10-31 (Docker stack, runbook, backup script; Cloudflare, R2, monitoring, deploy.sh, restore drill not done) |

**MVP build 2026-10-31:** a runnable slice of phases 2, 3, 5, 6, 7, 8 exists on `main` (Docker Compose: db, api, web, caddy, mailpit). Scope, cuts and ownership: [mvp-scope.md](./mvp-scope.md). What works, how to run it, test results and open owner decisions: `docs/mvp-status.md`. Phase 4 (KiotViet import) is not started. Phases marked "MVP slice done" still carry their full acceptance criteria for go-live (owner review, real images, bank app QR check, SePay link, production hosting).

Total: **~15.5-20 person-weeks** (sum 15.55-20.05); launch path without phase 4: ~14.3-18.3; calendar ~4-5 months solo. History: red team 16-20, owner decisions A-C -> 15-19, S1 no change, S2 +1.0-1.25 (P6 SePay webhook, ~6 person-days per research estimate [U]; excludes SePay account setup and bank linking, which are owner time), **S3 -0.25 (P7 users screen deferred, D2)**. **Owner turnaround (deliverables below) is calendar time outside this estimate.** Payload estimate was 10-12; the gap is the hand-built admin.

## Dependencies

- One developer, phases run **sequentially** in the order 1, 2, 3, 5, 6, 7, 4, 8 (file numbering kept). No parallel phases. Flyway ranges: P2 V1-9, P3 V10-19, P4 V20-29, P5 none, P6 V40-49 (V40-V43 used), P7 V50-59, P8 V60+; dev/CI use `out-of-order=true`, prod does not [RT#12].
- Phase 4 needs the owner's KiotViet export; it is no longer on the launch path (catalogue seeded in phase 3) [RT#14]. If it ships after go-live, its migration is renumbered above the latest prod version.
- Phase 6 step 10 (webhook) needs the owner's bank name and a SePay account with the company account linked. If SePay cannot link it: re-plan for Casso (contract unread) or ship phase 6 with `DNA_SEPAY_ENABLED=false` (manual PAID) and the webhook as a follow-up release; the rest of phase 6 does not depend on it.
- "Shippable" per phase = merged to `main`, CI green, demoable on dev Compose. First production go-live = phase 8.

## Owner deliverables [RT#15]

| Deliverable | Needed by | Owner |
|---|---|---|
| Answers to open questions 1, 3, 4, 7, 11 and the Q5 open items | Before the phase that uses them (3, 4, 6, 7) | Owner |
| Packing of SV465 Thùng (`SV465-4L- T80`) and Dây 8 (`SV465-4L- G8`) confirmed (prices stay "Liên hệ" until then) [V4, D1] | Any time; not launch-blocking | Owner |
| ~32 product images (>= 1 per product; placeholder allowed with admin warning) | Phase 3 demo; launch (phase 8) | Owner |
| Bank name, BIN, account no, account name + one QR from the bank app + one test transfer with content `DNA...` (content fixture) | Bank name before phase 6 starts (decides SePay vs Casso); rest in phase 6 | Owner |
| SePay account + company bank account linked (bank login/OTP done by owner) [W1] | Phase 6 step 10 (webhook testing); go-live | Owner, dev configures webhook |
| Notification mailbox + SMTP sending account | Phase 6 (test mail), go-live blocker | Owner, dev sets up |
| 7 static/policy pages text, >= 1 news article, 4 news category names | Phase 7 | Owner |
| KiotViet export of the 69 codes + import template | Phase 4 (not launch-blocking) | Owner |
| Domain + DNS access; VPS, Cloudflare, R2, healthchecks.io accounts | Phase 8 (start domain during phase 5) | Owner, dev sets up |

## Acceptance criteria (phase 1 overall)

- [ ] All 69 catalogue SKUs (32 products) loaded by the phase-3 seed, prices match catalogue to the đồng; exactly the 2 SV465 packing SKUs hidden-price + flagged, napkin SKUs priced [RT#14, V4, D1]; import acceptance (phase 4) verified separately with the real export when available.
- [ ] Storefront pages A1-A16 + A19 pass mobile (390px) and desktop (1440px) review against wireframes; no hidden price in any public response (`PublicPriceLeakIT`).
- [ ] Quote and order submit end to end; server totals equal sum of snapshots; confirmed-order VietQR (amount + content) scans in 2 bank apps; owner receives new-order email.
- [ ] One real small transfer to a confirmed order on prod is auto-marked PAID with audit actor `BANK_WEBHOOK`; a mismatched transfer lands in REVIEW and leaves the order unchanged [W1, W2] (or the documented `DNA_SEPAY_ENABLED=false` gap if SePay cannot link the account).
- [ ] Admin: owner completes product edit, order status flow (incl. manual MANAGER mark-paid fallback and REVIEW link/dismiss) and, once phase 4 ships, import preview/apply without developer help.
- [ ] Direct-to-origin requests fail; backups monitored and restored successfully in a drill; auto-revert rehearsed; go-live checklist in phase 8 all ticked.

## Open questions (owner)

1. Real KiotViet export: headers, one row per unit code, base-unit link column, status column, VAT meaning (blocks phase 4 only, not launch).
2. **Resolved [V1]:** price-mismatch threshold 2%, warn both directions.
3. Pack priced above base x conversion: show nothing (plan default) or "Bằng giá mua lẻ"? (not asked in S1; default stands)
4. Discount ladder stacks on promo prices? (default: yes, applied to post-promo subtotal; ladder empty at launch).
5. **Decided [V2, W1, W2] 2026-10-29:** SePay notifier + own EMVCo QR, policy A auto-PAID, QR only after staff confirm the total (see Decisions "Payments"). Open items (not answered; verify, do not assume):
   - a. Owner's bank: not named yet; SePay support for it unverified [U] (SePay bank list not found in research).
   - b. Whether the CÔNG TY TNHH corporate account can be linked to SePay (and as corporate or personal) [U].
   - c. SePay retry window conflict: 7 retries / 5 h (docs.sepay.vn) vs 8 attempts / ~33 min (developer.sepay.vn) [U]; design assumes loss and reconciles.
   - d. SePay price table (FREE 50 tx/mo, STARTUP 120,000đ/mo, ...) came from a summarising fetch: re-check on https://sepay.vn/bang-gia.html before budgeting; count all incoming credits, not only orders.
   - e. Casso fallback: webhook payload, auth header, retry and pricing not read [U].
6. Notification channel: email required, go-live blocker (decided [RT#6]); confirm mailbox + SMTP account; Zalo optional, later.
7. Quote code format: `BG` + 6 Crockford (plan default)?
8. **Resolved [V6]:** browser print-to-PDF (print CSS), no server PDF library; Excel export stays server-side.
9. Role split: manual "Đã nhận tiền" and REVIEW queue MANAGER-only; PAID also by the exact-match webhook (RT#6 amended by W2); EDITOR may handle other statuses (default kept; moot at launch, single MANAGER [V3]).
10. **Resolved [V7]:** KiotViet name change updates SKU/unit name only; product display name stays web-owned.
11. News: names of the 4 post categories; domain, VPS provider, Cloudflare + R2 accounts (see Owner deliverables).
12. **A-C decided 2026-10-29:** A cut (no dashboard / audit viewer, `/admin` -> product list; its minimal users screen later deferred by D2); B trimmed (ladder kept, empty = off, one `discount_total` + note, no progress bar); C kept (large KiotViet-style modal). Details: P1 C5/C13/C14, P3, P6, P7.
13. **Decided [D1] 2026-10-30:** 175x120 napkin (`SV300-3L-Gói`, `SP000014`) shows its printed prices, no `needs_confirmation`; owner fixes later if wrong. Only the SV465 packing SKUs stay hidden-price + flagged.
14. **Decided [D2] 2026-10-30:** phase-7 users screen + API deferred; EDITOR role and bootstrap MANAGER kept; accounts via the phase-8 SQL runbook.

## Red Team Review

### Session - 2026-10-29

**Findings:** 25 raw, merged to 15 groups + 3 owner decisions (A-C) · **Severity:** Critical 1 (#14) · High 12 (#1-6, #8-12, #15) · Medium 2 (#7, #13)

| # | Finding | Severity | Disposition | Applied To |
|---|---|---|---|---|
| 1 | ufw does not filter Docker-published ports; origin reachable bypassing Cloudflare | High | Accept: Authenticated Origin Pulls in Caddy, 443 only, ufw SSH-only, direct-origin smoke check | P8, P2 |
| 2 | Username lockout = DoS on the owner; distinct locked response enumerates | High | Accept: (username, IP) progressive delay, identical 401, recovery runbook (second MANAGER dropped [V3]: accepted risk; in-app unlock dropped with the users screen [D2]: restart clears delays) | P2, P8 |
| 3 | Disable/role change/password reset do not end live sessions | High | Accept: per-request `SessionValidityFilter`, 12 h absolute cap, `SessionValidityIT` (direct DB updates; P7 user ITs dropped with the users screen [D2]) | P2 |
| 4 | Hidden prices can leak via cart price, 409 body, XLSX, blocks | High | Accept: single `PublicPriceRedactor`, route-enumerating `PublicPriceLeakIT` | P5, P6, P7, P2 |
| 5 | Form guard: spoofable fill time, token rotation, Turnstile off by default, duplicate submits, proxy IP | High | Accept: drop fill time + link token, Turnstile default on + prod assertion, `submissionId`, price check before Turnstile, CF client IP from P2 | P6, P2, P1 |
| 6 | Payment destination can be changed or misreported | High | Accept: manual PAID + bank settings MANAGER-only, password + email alert, amount freeze/re-issue, `paid_amount`, email notification go-live blocker. **Amended by owner decision W2 (2026-10-29): PAID may be set by MANAGER or by the authenticated exact-match webhook** | P6, P7, P8, P2 |
| 7 | Admin URL fields allow script URLs / arbitrary embeds | Medium | Accept: `UrlFieldValidator` + map host allow-list; nonce CSP deferred | P7, P8 |
| 8 | Image decode / XLSX zip bombs exhaust heap | High | Accept: 16 MP header cap, single-permit semaphore, POI ZipSecureFile limits, upload-under-load check | P3, P4, P8 |
| 9 | Build-time prerender calls API; errors cached as empty | High | Accept: request-time data routes, `server-fetch` throws, build without API in CI + smoke | P5, P2, P8 |
| 10 | Import bypasses editor invariants; options matrix overbuilt | High | Accept: shared `saveAggregate`, hidden new SKUs, reactivation rule, ack skip, fixed rules | P4, P3, P1 |
| 11 | Backups unmonitored; retention step missing; drill compares to moving prod | High | Accept: healthchecks.io, R2 lifecycle, snapshot counts, offsite predeploy dump, client-side encryption dropped | P8 |
| 12 | CD pipeline/rollback/migrations overbuilt yet unsafe | High | Accept: manual `deploy.sh` with auto-revert, CI build+test, migration rule, out-of-order dev/CI, FK moved to P3, restore runbook | P8, P2, P3, P4, plan |
| 13 | On-demand revalidation machinery not worth it | Medium | Accept: `revalidate: 60`, read-time promo, ~60 s staleness documented | P5, P3, P7, P8 |
| 14 | Launch blocked on owner's KiotViet export | Critical | Accept: hand-built seed CSV + `CatalogueSeedLoader`; P4 off launch path; sequential order | P3, P4, P8, plan |
| 15 | Owner inputs untracked; publish blocked by missing images | High | Accept: Owner deliverables table, placeholder image + warning, calendar note | plan, P3, P5 |
| A/B/C | Dashboard + audit viewer / promo-ladder depth / editor modal | - | Owner 2026-10-29: cut / trimmed / kept | plan, P1-P3, P6-P8 |

Contract fixes: P6 owns "hide referenced SKU" + `SkuReferencedRemovalIT`; FK violation -> 409 `CONFLICT_STATE` (P2); "Chờ nhập KiotViet" = COD in CONFIRMED + BANK_TRANSFER in PAID via one predicate (P6). Earlier sweeps (red team; A-C): stale terms removed, components moved to owning phases, effort 16-20 -> 15-19; 0 contradictions each.

## Validation Log

### Session 1 - 2026-10-29

| # | Question | Owner answer | Applied to |
|---|---|---|---|
| 1 | Price-mismatch threshold | 2%, both directions (default confirmed) | Q2, P3 |
| 2 | VietQR | Dynamic QR (amount + content) after staff confirm + webhook auto-marks PAID (provider decided in S2) | Decisions, Q5, P6 |
| 3 | Users | One account only, no backup; EDITOR role kept, unused; owner accepts risk | Decisions, deliverables, P2, P7, P8 |
| 4 | Unconfirmed codes | 4 catalogue-flagged SKUs seeded `price_visible=false` + `needs_confirmation` (narrowed to the 2 SV465 packing SKUs by D1, S3) | P1, P3 |
| 5-8 | Webhook provider; session calls; PDF; KiotViet name | Decided in S2; idle 4 h + 12 h cap, in-memory counters, owner-email re-auth confirmed; browser print-to-PDF; SKU/unit name only | Q5, Q8, Q10, P2, P4, P6, P7, P8 |

S1 sweep (condensed): second-MANAGER items removed, `sku.needs_confirmation` introduced, Q2/Q8/Q10 resolved; 0 contradictions.

### Session 2 - 2026-10-30

| # | Question | Owner answer (decided 2026-10-29) | Applied to |
|---|---|---|---|
| W1 | Webhook provider | SePay (notifier) + own EMVCo QR; Casso fallback; payOS rejected (gateway) | Decisions, Q5, P1 (C15), P2, P6, P7, P8 |
| W2 | Auto-PAID policy | A: exact match -> PAID by system actor `BANK_WEBHOOK`; else REVIEW; manual MANAGER fallback; RT#6 amended | Decisions, RT#6 row, Q9, P2 matrix, P6 |

Effort: P6 3-4 -> 4-5.25; total 15-19 -> 16-20 [U]. Verification tier Full: claims checked via the Red Team evidence; [U] items resolved in the phase-2 spike or before phase 6 step 10. S2 sweep (condensed): pending-webhook notes, "static QR" and MANAGER-only PAID wording reconciled across plan, P1, P2, P6, P7, P8; intentional hits `emvco.ts` and "payment gateway" (still excluded); 0 contradictions.

### Validation Session 3 - 2026-10-30

| # | Question | Owner answer (2026-10-30) | Applied to |
|---|---|---|---|
| D1 | 175x120 napkin hidden-price? (Q13) | No: `SV300-3L-Gói` + `SP000014` show prices, no flag; owner fixes later if wrong. Only `SV465-4L- T80` + `SV465-4L- G8` stay hidden-price + flagged (the only `*` packing marks, `docs/catalogue-text.txt:105-111`, note `:499`; note `:500` is a size-unit remark, not packing) | Decisions Product, deliverables, acceptance, Q13, P1 C2, P3 seed + tests, P5 |
| D2 | Defer users screen? (Q14) | Yes: no users screen/API in phase 1; EDITOR role + bootstrap MANAGER kept; SQL runbook (hash command, restart clears login delays, create/disable/reset/role) | Decisions Auth + Admin scope, RT#2/#3 rows, Q12, Q14, P1 C13, P2, P7 (renamed `phase-07-content-and-settings.md`), P8 |

Effort: P7 1.25-1.5 -> 1.0-1.25; total 15.8-20.3 -> 15.55-20.05 (~15.5-20). S3 sweep: grepped plan.md + 8 phases for `users screen|Users \(MANAGER\)|UserAdminIT|reset password|unlock|SV300-3L|SP000014|needs_confirmation|175`; every remaining hit is either the D1/D2 decision text, the SV465-only flag, the SQL runbook, or the "deferred" note; 0 contradictions.
