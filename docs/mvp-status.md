# DNA web MVP: status and handover (2026-10-31)

> Historical. The storefront has since become the Tín Phát Decor catalogue, see [tinphat-catalogue.md](tinphat-catalogue.md).

A runnable slice of phases 2, 3, 5, 6, 7 and 8 of `plans/261029-1949-dna-web-phase1/plan.md`, built in one session and run entirely in Docker. Scope and ownership: `plans/261029-1949-dna-web-phase1/mvp-scope.md`. API shapes: `docs/api-contract-mvp.md`. Run and operate: `docs/deployment-guide.md`. Architecture: `docs/system-architecture.md`.

## Run it

```
copy deploy\.env.example deploy\.env                          # only on a fresh clone: deploy/.env is gitignored (dev values)
docker compose -f deploy/compose.yml up -d --build --wait     # first build ~3 min, then ~1 min (deploy/.env is read automatically)
node scripts/seed-demo.mjs                                    # optional: a few labelled demo orders and quotes
```

| What | Where |
|---|---|
| Storefront | http://localhost:8000 |
| Admin | http://localhost:8000/admin, login `owner` / `Dna-Dev-2026-Owner!` (dev placeholder, MANAGER) |
| Mail inbox (new order / quote notifications) | http://localhost:8025 |
| Database (debug only) | `127.0.0.1:55432`, user/password in `deploy/.env` |

Port 8000 listens on this machine only (`HTTP_BIND=127.0.0.1`). Stop: `docker compose -f deploy/compose.yml down` (add `-v` to wipe the database).

## What works

- **Catalogue:** the 32 products / 69 SKUs of the 26/10/2026 catalogue, loaded from `apps/api/src/main/resources/seed/catalogue-2026.csv` on first start, prices checked against the printed catalogue (sum 23.600.440đ). Home, category and brand listings (brand filter, sort, paging), product page with the Gói/Dây/Thùng picker, per-unit price, "Tiết kiệm x,x%" / "Bằng giá mua lẻ", search with suggestions, sitemap, robots, JSON-LD.
- **"Liên hệ" SKUs:** SV465 Thùng and Dây 8 are seeded with a hidden price and an admin-only "Cần xác nhận quy cách" flag. Their price never leaves the API (one redactor, checked in unit tests, an integration test, the smoke script and the browser test).
- **Quote and order:** localStorage baskets, server repricing (client prices ignored), `PRICE_CHANGED` handling, idempotent submit, honeypot and per-IP limits, codes `DNA`+6 / `BG`+6, lookup by code + phone, order page with status steps. Bank transfer shows account number and content as text first; the VietQR (amount + content) appears only after staff confirm the total.
- **Admin:** login (CSRF, progressive delay, session re-check), products list and editor modal (SKU table, live "Đơn giá/gói", ±2% mismatch warning, price history, publish/discontinue), categories, brands, quote/order queue with the full status flow (confirm with shipping fee, mark paid, KiotViet code, ship, complete, cancel), bank review queue, bank settings (MANAGER, password re-entry, owner alert mail).
- **Payments:** SePay-style webhook `POST /api/webhooks/bank/sepay` (`Authorization: Apikey <key>`): an exact match (one `DNA` code, CONFIRMED bank-transfer order, amount = total, configured account, money in) marks the order PAID with actor `BANK_WEBHOOK`; anything else goes to the REVIEW queue and never touches the order. Manual "Đã nhận tiền" stays as the MANAGER fallback.
- **Infrastructure:** Compose stack db (PostgreSQL 18), api (Spring Boot 4.1.2, Java 21), web (Next.js 16.4.3), caddy (`/api/*` to api, everything else to web, spoof-proof client IP header), mailpit. Backup script `scripts/backup.sh`, SQL account runbook and restore procedure in the deployment guide.

Simulate a bank notification for an order you confirmed (replace the code and amount):

```
curl -X POST http://localhost:8000/api/webhooks/bank/sepay -H "Authorization: Apikey dev-sepay-key-change-me" -H "Content-Type: application/json" -d '{"id":900001,"gateway":"MBBank","transactionDate":"2026-10-31 15:00:00","accountNumber":"0123456789","content":"DNAXXXXXX chuyen khoan","transferType":"in","transferAmount":123000,"referenceCode":"FT900001"}'
```

## Verification (all run on the merged tree)

| Check | Result |
|---|---|
| API: `mvn -B -f apps/api/pom.xml test` (unit + Testcontainers ITs, needs Docker running) | 292 tests, 0 failures, 0 skipped (run on the hardening branch; `apps/api` on `main` is identical, the rerun on merged `main` was stopped by low memory, run it once to confirm) |
| Web: `npm test` in `apps/web` | 214 tests in 31 files |
| Web: `npm run build` with no API reachable | passes, every data route renders per request |
| `bash scripts/smoke.sh` against the running stack | 13/13 |
| `node scripts/api-flow-check.mjs` (catalogue, redaction, quote, order, tamper, replay, lookup, admin flow, QR timing, webhook exact/mismatch/replay, REVIEW, quote flow, price edit with history, mail) | 61/61 |
| `npx playwright test` in `apps/web` (real Chrome: browse, unit picker, hidden price, quote, order, admin confirm, customer QR, 390px no horizontal scroll) | 7/7, screenshots in `docs/mvp-screens/` |

The flow check (61/61) and the browser run (7/7) were run on the stack built before the review fixes below; rerun them after the first `up --build` of the current `main`.

`api-flow-check` and the Playwright run create orders and quotes: use `down -v` and a fresh start (plus `seed-demo.mjs`) afterwards for a clean demo.

## Independent review (read-only, by code reading)

No critical or high defects found in the application code: money and totals, the order state machine, webhook auth and exact-match rules, hidden-price redaction, sessions, CSRF and roles all held up. Fixed afterwards: unmatched bank notifications are now visible and re-processed on replay; bcrypt 72-byte password limit; only MANAGER can change `visible` on categories, brands and SKUs; shipping fee and paid amount bounds with overflow-safe totals; SKU price must be above 0; production profile refuses short or placeholder SePay keys; the catalogue seed runs once per database; the payment matcher ignores order-code lookalikes such as the payee name. Deployment-shaped findings (production profile, Cloudflare client IP, key strength) are written up in `docs/deployment-guide.md`, "Before this stack faces the internet". Accepted for the MVP: replayed `submissionId` ignores a changed basket; no per-IP limit on `cart/price` and suggestions; the catalogue is read in full per listing call.

## Cut from the MVP (still in the plan)

| Area | Not built |
|---|---|
| Phase 4 | KiotViet Excel import (needs the owner's real export; not launch-blocking) |
| Catalogue | image upload and resizing (products show a placeholder; the editor takes an image URL), slug history and redirects, attribute filters, bulk edit, merge/duplicate, category/brand delete or merge |
| Sales | Turnstile, Excel and print exports, `/bang-gia`, contact form, amount re-issue after confirm, line edits after submit, SePay reconcile job (a lost webhook is handled by the manual "Đã nhận tiền") |
| Content | news, pages CMS, home blocks, discount-tier editor (tiers stay empty = off), users screen |
| Ops | Cloudflare, R2 offsite backup, monitoring, `deploy.sh` with auto-revert, CI workflow, restore drill on a server |

## Decisions taken while you were away

- Agent Teams was not available in this session (no `TeamCreate`), so the work ran as parallel sub-agents, each in its own git worktree with strict file ownership, merged into `main` by the lead.
- Seeded products are published on first start (`DNA_SEED_CATALOGUE_PUBLISH=true`) so the storefront is not empty; the plan default is draft.
- Port 8000 is bound to localhost only because the demo admin password is a known placeholder.
- Dev limits for orders, quotes and lookups are raised in `deploy/.env` (Docker Desktop shows every visitor as one IP); the API defaults (5 / 5 / 10 per 10 minutes) apply when the variables are unset.
- Bank account in `deploy/.env` is a placeholder (MB Bank BIN 970422, account 0123456789): replace it in `/admin/settings` before any QR is shown to a real customer.
- "Cần bổ sung" lists every product while images cannot be uploaded (the contract counts a missing image).

## Before go-live (owner and next sessions)

1. Check the VietQR with two real bank apps (the EMVCo tags are unit-tested against an independent CRC but never scanned), then set the real bank account.
2. Link the company account to SePay (or fall back to manual PAID) and set `DNA_SEPAY_WEBHOOK_KEYS`, `DNA_SEPAY_ACCOUNT_NO` from the real values.
3. SMTP mailbox for notifications (Mailpit only catches mail locally); owner email in settings.
4. About 32 product images and a way to upload them (image pipeline is cut).
5. Confirm SV465 packing (80 / 8 per the printed prices vs 100 / 10 in the data note), then switch "Hiện giá" on in the editor; confirm the 175x120 napkin size unit.
6. Review the policy pages (`/chinh-sach`, `/gioi-thieu`, `/lien-he`): the wording is a draft.
7. Production: domain, VPS, Cloudflare Authenticated Origin Pulls, backups offsite, change every dev credential in `deploy/.env`, set `HTTP_BIND=0.0.0.0` only on the server.
8. KiotViet import (phase 4) once the real export is available.

## Known limitations

- One MANAGER account (bootstrapped from env); other accounts and password resets via the SQL runbook; no password-change screen (API endpoint exists).
- `GET /api/admin/settings` is MANAGER-only; an EDITOR sees no settings screen data and the product editor falls back to the server's warnings.
- Flyway runs with `out-of-order` outside the `prod` profile and logs one warning.
- The Next dev server must be opened as `localhost` (not `127.0.0.1`).
- Phase 1 docs and wireframes still wait for the owner's review of the diff (plan criterion).
