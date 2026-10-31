---
phase: 8
title: "Hardening and deploy"
status: pending
priority: P1
effort: "1.5-2 pw (estimate; CD pipeline/load test/encryption dropped, origin mTLS + auto-revert + backup monitoring added; excludes owner content writing and DNS/registrar lead time)"
dependencies: [1, 2, 3, 5, 6, 7]
---

# Phase 8: Hardening and deploy

## Overview

Production on one 4 GB Vietnam VPS behind Cloudflare Free: images, prod Compose, Caddy with Cloudflare Authenticated Origin Pulls, security review, edge rate limits + real Turnstile keys, light-load check, monitored offsite backups with a restore drill, manual `deploy.sh` with automatic revert, go-live checklist. First public launch. Phase 4 normally runs just before this phase (recommended order) but is not a hard dependency: if the owner's export is late, launch proceeds on the phase-3 seed and phase 4 ships afterwards [RT#14].

## Requirements

- Origin access [RT#1]: Cloudflare Authenticated Origin Pulls (mTLS) — Caddy requires and verifies Cloudflare's origin-pull client certificate on 443, so no Cloudflare IP list is maintained anywhere. Only Caddy publishes a port (443; port 80 not published, Cloudflare "Always Use HTTPS" redirects at the edge); `api` and `db` on an internal network. ufw is used for SSH only (Docker-published ports bypass ufw, so ufw is never relied on for 443).
- TLS: Cloudflare "Full (strict)" with a Cloudflare origin certificate in Caddy.
- Backups [RT#11]: daily `pg_dump -Fc` (PG 18 client) + `counts.json` taken from the same snapshot, uploads copied to private R2 bucket; retention by R2 lifecycle rules (`db/daily/` 14 days, `db/monthly/` ~100 days = 3 monthly, `db/predeploy/` 30 days); healthchecks.io ping only on success, missed run alerts owner + developer by email; restore drill passes before launch and monthly after. No client-side encryption: R2 encrypts at rest; the dump holds customer names, phones and addresses, so the bucket stays private and the token is scoped to that bucket.
- Deploy [RT#12]: manual `deploy/scripts/deploy.sh <git-sha>` run from the developer machine (Git Bash on Windows): builds images locally without the API, ships them over SSH, pre-deploy dump uploaded offsite, `up -d`, health + smoke, **automatic revert to the previous image tag** when health or smoke fails. No registry, no CD workflow. CI = build + test only (phase 2).
- Migration rule [RT#12]: no NOT NULL column without a default, expand-then-contract (never drop/rename a column the previous image still uses); checked per release in the go-live/release checklist and in review. Flyway on PostgreSQL runs each migration in a transaction, so a failed migration leaves the old schema and the old image keeps working.
- Memory within budget (FE report s.6): caddy 64 MB, web 512 MB (`--max-old-space-size=384`), api 896 MB (`-Xmx512m -XX:MaxMetaspaceSize=160m -XX:+ExitOnOutOfMemoryError`), db 768 MB (`shared_buffers=256MB`, `effective_cache_size=1GB`, `max_connections=30`, `work_mem=8MB`), backup 128 MB, OS ~0.5 GB, 2 GB swap. No PDF rendering on the server (browser print-to-PDF [V6]), so no headroom is reserved for it; Excel exports (POI, small files) fit in the api heap.
- Email notification is a go-live blocker [RT#6]: SMTP account configured, SPF/DKIM set for the sending domain, test order mail received by the owner.
- Bank webhook [W1, W2]: SePay reaches `POST /api/webhooks/bank/sepay` through Cloudflare + Caddy; secrets (`DNA_SEPAY_WEBHOOK_KEYS`, `DNA_SEPAY_API_TOKEN`, `DNA_SEPAY_ACCOUNT_NO`, `HC_RECONCILE_PING_URL`) only in the VPS `.env`; reconcile job monitored by healthchecks.io; go-live needs the owner's SePay account with the company account linked, "Gửi thử" and one real transfer (checklist). If SePay cannot link the account, launch with `DNA_SEPAY_ENABLED=false` (manual "Đã nhận tiền") and treat the webhook as a follow-up release.

## Architecture

```
Internet ─> Cloudflare (proxy, cache rules, WAF rate limit, Turnstile; presents origin-pull client cert)
   ─443 only, mTLS required (Authenticated Origin Pulls)─> caddy ──/api/*──────> api:8080 ──> db:5432 (internal net)
                                                              ├─/api/webhooks/* (body <= 64 KB) ─> api:8080   [W1]
                                                              ├─/uploads/*──> /data/uploads (ro, immutable cache)
                                                              ├─/actuator/* ─> 404
                                                              └─/*──────────> web:3000 ──(RSC fetch, revalidate 60)──> api:8080
SePay ─POST /api/webhooks/bank/sepay─> Cloudflare (no challenge/Turnstile on this path) ─> caddy ─> api   [W1]
api BankReconcileJob (every 30 min) ─HTTPS─> SePay transaction API ; ok -> ping healthchecks.io (reconcile check)
backup (cron 02:30 ICT): pg_dump -Fc + counts.json (same snapshot) -> R2 db/daily/ (+ db/monthly/ on the 1st)
                         rclone copy /data/uploads -> R2 uploads/ ; all ok -> ping healthchecks.io
dev machine: deploy.sh <sha> ─build─> docker save | ssh vps docker load ─ssh─> predeploy dump -> R2 db/predeploy/
             -> IMAGE_TAG=<sha> compose up -d -> health -> smoke.sh (from dev machine) ─fail─> IMAGE_TAG=<previous> up -d
```

- Caddy origin mTLS [RT#1]: `tls /etc/caddy/origin.pem /etc/caddy/origin-key.pem { client_auth { mode require_and_verify; trust_pool file /etc/caddy/cloudflare-origin-pull-ca.pem } }` (directive name per the pinned Caddy 2.x version [U]; older releases use `trusted_ca_cert_file`); Authenticated Origin Pulls switched on in the Cloudflare dashboard (zone-level). Residual: zone-level AOP uses Cloudflare's shared certificate, so another Cloudflare account could front the origin; acceptable here because in-app limits are the floor; upgrade path = per-hostname AOP with our own certificate.
- Client IP [RT#5]: Cloudflare sets `CF-Connecting-IP`; Caddy passes it through to `api`; `ClientIpResolver` (phase 2) already reads it. No `trusted_proxies` list needed because AOP guarantees every request on 443 came through Cloudflare.
- Headers (Caddy): HSTS, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` minimal, CSP `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com https://www.google.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` (ship as Report-Only for 1 week if anything breaks). Nonce-based CSP (dropping `'unsafe-inline'` for scripts) is deferred to a later release [RT#7]; server-side URL validation (phase 7) is the current control. Body limits: 6 MB images, 2 MB import, 1 MB default.
- Cloudflare: DNS proxied; Always HTTPS; Authenticated Origin Pulls on; cache rules `/_next/static/*` and `/uploads/*` (long edge TTL), no rule for HTML/`/api/*`/`/admin/*`/`/don-hang/*` (verify `cf-cache-status: DYNAMIC`); disable Email Address Obfuscation and Rocket Loader (they rewrite HTML and break React hydration); WAF rate-limit rule for `/api/auth/login` and `/api/public/(orders|quotes|contact|orders/lookup)` (Free-plan rule count [U]; in-app limits remain the floor); real Turnstile site/secret keys.
- Webhook route [W1]: Caddy `handle /api/webhooks/*` with `request_body { max_size 64KB }` -> api. Rate limit: Caddy core has no rate-limit directive (third-party `caddy-ratelimit` plugin [U], not added); the floor is the phase-6 in-app limit (120/min) plus a Cloudflare WAF rate-limit rule on the path if the Free-plan rule count allows [U]. Cloudflare must not challenge server-to-server POSTs on this path: no Turnstile, Bot Fight Mode / Browser Integrity Check skipped or off for `/api/webhooks/*` [U: verify with "Gửi thử"]. Optional SePay IP allowlist (7 IPv4 + 2 IPv6 published [V]) as a Cloudflare WAF custom rule or a Caddy matcher on `CF-Connecting-IP` (the TCP peer is Cloudflare) [U: unverified that SePay calls come only from the listed IPs]; the API key stays the real control.
- Monitoring (KISS): free external uptime check on `/` and `/api/public/nav`; healthchecks.io for backups [RT#11] and for the bank reconcile job (period 30 min, grace 30 min, email owner + developer) [W1]; Docker log rotation (`json-file`, 10 MB x 3).
- Webhook key rotation runbook [W1]: add the new key as second value of `DNA_SEPAY_WEBHOOK_KEYS`, redeploy, change the key in SePay, send "Gửi thử", remove the old key, redeploy. Rotate on any suspected leak and when a developer leaves. SePay outage: manual "Đã nhận tiền" continues; reconcile job catches up after recovery (48 h window; older gaps matched by hand from the bank statement).
- Data restore trade-off [RT#12]: restoring a dump loses every order/quote/contact created after it; runbook step 1 = export those rows (admin Excel per order or `COPY ... TO CSV` for rows with `created_at > dump time`) before restoring, then re-enter them.
- Account recovery and user runbook [RT#2, D2] (no users screen in phase 1, so this is the only way to manage accounts): `docker compose restart api` clears all in-memory login delays; bcrypt hash from one documented command (e.g. `htpasswd -nbBC 12 x '<password>'`, take the part after `x:`; exact command verified on the VPS and written into the guide [U]); password reset `update app_user set password_hash = '{bcrypt}' || '<hash>', password_changed_at = now() where username = ...` (old sessions die on next request); create a user `insert into app_user(username, password_hash, display_name, role, enabled) values (...)`; disable / re-enable `update app_user set enabled = false|true`; role change `update app_user set role = ...` (the phase-2 `SessionValidityFilter` ends the old session). With a single MANAGER account [V3] this runbook is the only recovery path: the developer keeps SSH access to the VPS and the runbook in `docs/deployment-guide.md`.

<!-- Updated: Validation Session 1 - single account recovery note; no server PDF in memory budget -->
<!-- Updated: Validation Session 3 - D2: runbook covers create/disable/reset/role change by SQL + hash command; no users screen -->

## Related Code Files

Create:
- `D:\dna-web\apps\api\Dockerfile`, `apps\api\.dockerignore` (multi-stage Maven -> `eclipse-temurin:21-jre`, non-root)
- `D:\dna-web\apps\web\Dockerfile`, `apps\web\.dockerignore` (`node:24-alpine`, standalone output, non-root; build needs no API [RT#9])
- `D:\dna-web\deploy\compose.prod.yml`, `deploy\caddy\Caddyfile` (incl. `/api/webhooks/*` body limit [W1]), `deploy\caddy\cloudflare-origin-pull-ca.pem` (public Cloudflare CA cert) [RT#1]
- `D:\dna-web\deploy\backup\Dockerfile` (`postgres:18-alpine` + rclone + curl + crond), `deploy\backup\backup.sh` (modes `daily`, `predeploy`), `deploy\backup\restore-drill.sh`, `deploy\backup\crontab`
- `D:\dna-web\deploy\scripts\vps-bootstrap.sh` (Ubuntu 24.04: deploy user, SSH keys only, ufw SSH-only, unattended-upgrades, 2 GB swap, Docker Engine + compose plugin), `deploy\scripts\deploy.sh` (build, ship, predeploy dump, up, health, smoke, auto-revert), `deploy\scripts\smoke.sh`
- `D:\dna-web\.github\dependabot.yml`
- `D:\dna-web\docs\deployment-guide.md` (setup, deploy, auto-revert, restore incl. order export, account recovery + SQL user management [D2], Cloudflare settings incl. AOP and the webhook path, SePay webhook key rotation [W1], R2 lifecycle rules, go-live checklist)
- `apps\api\src\test\java\vn\dnahoangnguyen\api\security\AdminEndpointAuthorizationIT.java`

Modify: `apps\api\src\main\resources\application-prod.yml` (secure cookie, structured logs, forwarded headers, Turnstile enabled), `deploy\.env.example` (all prod vars incl. `HC_PING_URL`, `HC_RECONCILE_PING_URL`, `SPRING_MAIL_*`, `DNA_SEED_CATALOGUE_ENABLED`, `DNA_SEPAY_*` [W1]). The `e2e:smoke` npm script already exists (phase 5).

## Implementation Steps

1. Dockerfiles; verify both images build with no API reachable [RT#9].
2. Security review (use code-reviewer agent + checklist): every `/api/admin/**` mapping authenticated; MANAGER-only list matches phase-2 matrix (incl. manual mark-paid, bank transaction review queue and payment settings); `/api/webhooks/**` rejects requests without a valid API key and logs neither the key nor full account numbers [W1]; `PublicPriceLeakIT` covers every public route; uploads served with `nosniff`; no secrets in repo; session cookie flags; CSRF on all admin mutations; error bodies leak no stack traces; URL fields validated; `npm audit --audit-level=high` and Maven dependency check run locally, no high/critical.
3. Provision VPS with `vps-bootstrap.sh`; Cloudflare DNS + origin cert + Authenticated Origin Pulls; Caddyfile with `client_auth`; `compose.prod.yml` (only Caddy publishes 443) with limits, healthchecks (`pg_isready`, actuator health, web `/`), `restart: unless-stopped`.
4. Backup sidecar; R2 bucket (private) + bucket-scoped token; R2 lifecycle rules; healthchecks.io check (period 1 day, grace 2 h, email owner + developer); run `restore-drill.sh` into a scratch `postgres:18` container: row counts for product/sku/order/quote equal the dump's own `counts.json`, one image file checksum equals the VPS copy.
5. `deploy.sh <sha>`: `docker buildx build --platform linux/amd64` both images, `docker save | gzip | ssh` + `docker load`, remember current tag as previous, `backup.sh predeploy` (uploaded to R2 `db/predeploy/`), `IMAGE_TAG=<sha> docker compose up -d`, wait for health (max 120 s), run `smoke.sh` against the public domain; on failure redeploy the previous tag, re-run smoke, exit non-zero with the failing check.
6. Cloudflare rules, Turnstile keys, WAF rate limit; verify with `smoke.sh` and manual header check.
7. Light-load check [RT#8]: from a throwaway `node:24-alpine` container on the internal network run `npx autocannon -c 10 -d 120` against `http://web:3000` home/listing/product while uploading one 5 MB, ~16 MP JPEG through the admin; record `docker stats` peaks and api heap (`jcmd 1 GC.heap_info`) in `docs/deployment-guide.md`.
8. Prod data: first start with `DNA_SEED_CATALOGUE_ENABLED=true` (phase-3 seed), then unset; owner adds images/descriptions and publishes; content pages from owner; KiotViet import (phase 4) reconciles prices when the export is available.
9. Go-live checklist (below), then submit sitemap in Google Search Console.

## Tests

- `AdminEndpointAuthorizationIT`: enumerates all handler mappings; every `/api/admin/**` returns 401 anonymous; every MANAGER-only endpoint (incl. mark-paid, bank-transaction review, payment settings) returns 403 for EDITOR; every `/api/webhooks/**` mapping returns 401 without a valid key [W1].
- `smoke.sh` (run by `deploy.sh` from the developer machine, exits non-zero on failure): `/` 200; `/sitemap.xml` 200 and contains at least one `/san-pham/` URL [RT#9]; `/robots.txt` disallows `/admin`; `/actuator/env` 404; `/api/admin/me` 401 problem JSON; `POST /api/webhooks/bank/sepay` without key -> 401 (not a Cloudflare challenge page) [W1]; HSTS + CSP + nosniff headers present; one `/uploads/...` has `immutable`; **direct origin check** [RT#1]: `curl --resolve <domain>:443:<origin-ip> https://<domain>/` fails the TLS handshake (no client cert) and `curl http://<origin-ip>/` is refused.
- Auto-revert rehearsal [RT#12]: deploy a build whose health endpoint fails -> `deploy.sh` restores the previous tag and smoke passes again.
- Restore drill: `restore-drill.sh` prints counts and exits 0 only when they equal the dump's `counts.json` [RT#11].
- Backup monitor: skip one run (stop the backup container for a day) -> healthchecks.io alert email received [RT#11].
- Light load [RT#8]: p95 < 800 ms on the internal network, 0 errors, no container restart/OOM during the concurrent upload, total RSS < 3.2 GB, peak heap recorded.
- Playwright: full suite green locally (`npm run e2e`) before deploy; `npm run e2e:smoke` (read-only subset) green against prod [RT#12].

## Success Criteria

- [ ] Site live on the owner's domain via Cloudflare; direct-to-origin requests fail (smoke check) [RT#1].
- [ ] Restore drill passed against the dump's own counts and recorded in `docs/deployment-guide.md` (date, duration) [RT#11].
- [ ] Auto-revert rehearsed once with a deliberately failing build [RT#12].
- [ ] Backup success pings visible in healthchecks.io; missed-run alert verified [RT#11].
- [ ] Lighthouse mobile on prod: Performance >= 85, Accessibility >= 95, SEO = 100 (home, listing, product).
- [ ] Rich Results Test passes for 3 product pages.
- [ ] Go-live checklist complete: owner pages published; bank settings set and QR scanned in 2 bank apps; **SePay [W1, W2]: owner's SePay account active with the company account linked, webhook URL + API key set in SePay, `DNA_SEPAY_ACCOUNT_NO` = settings account, "Gửi thử" -> 200 and one stored row, one real small transfer to a confirmed test order -> PAID with audit actor `BANK_WEBHOOK`, reconcile healthchecks ping visible** (or, if SePay cannot link the account, `DNA_SEPAY_ENABLED=false` recorded as a known gap); 10 random SKU prices match the catalogue; test quote + test order placed on prod, **order email received by the owner** [RT#6], then cancelled; **one MANAGER account (owner) with a strong password, no backup account, no EDITOR account** (owner accepted risk [V3]), bootstrap env vars removed, account runbook tested once (restart clears delays; SQL password reset with the documented hash command) [RT#2, D2]; Turnstile real keys; Authenticated Origin Pulls on; uptime monitor and backup monitor on; release migrations checked against the migration rule; sitemap submitted.

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| 4 GB RAM exhausted (JVM + Node + PG) | M x H | Hard limits, swap, `ExitOnOutOfMemoryError` + restart, light-load + upload check in step 7; fallback 8 GB VPS |
| Origin reached directly, bypassing WAF/Turnstile edge rules [RT#1] | M x H | Authenticated Origin Pulls; only 443 published; smoke direct-origin check every deploy |
| Backups silently failing [RT#11] | M x H | healthchecks.io dead-man's switch; restore drill before launch + monthly |
| Restore discards orders taken after the dump [RT#12] | L x H | Runbook exports post-dump orders first; pre-deploy dump narrows the window |
| Bad release breaks prod [RT#12] | M x M | `deploy.sh` auto-revert on failed health/smoke; expand-then-contract migrations |
| Deploy depends on one developer machine [RT#12] | M x M | Script documented in deployment guide; any machine with Docker + SSH key can run it |
| Cloudflare HTML rewrite features break hydration | M x M | Disable Email Obfuscation / Rocket Loader explicitly; Playwright smoke on prod |
| CSP blocks Turnstile or Next inline scripts | M x M | Report-Only first week; allow `challenges.cloudflare.com` |
| No maintainer after launch (security patches) | M x H | Dependabot + unattended-upgrades; owner to arrange a retainer (platform report s.6) |
| Domain / .vn registration lead time | M x M | Start registration during phase 5 (owner deliverable) |
| Cloudflare challenges or blocks SePay's webhook POSTs [W1] | M x M | No challenge on `/api/webhooks/*`; "Gửi thử" in go-live checklist; smoke expects 401 JSON, not a challenge page; reconcile job covers gaps |
| Webhook key leaked [W1] | L x H | Env only, never logged; two-key rotation runbook; exact-match rule limits damage to orders whose code + amount are known |
| Single admin account locked out / password lost [V3] | L x H | **Owner accepted risk: single account, recovery needs server access.** Account recovery runbook rehearsed before go-live; developer keeps SSH access |

<!-- Updated: Validation Session 1 - go-live checklist one MANAGER account, accepted-risk row -->
<!-- Updated: Validation Session 2 - SePay webhook route, secrets, monitoring, go-live checks, key rotation (W1/W2); effort unchanged (config + checks fit the existing estimate) -->

Rollback: webhook alone: `DNA_SEPAY_ENABLED=false` + redeploy, disable the webhook in SePay (manual "Đã nhận tiền" continues). Releases: automatic via `deploy.sh` (previous image tag); manual `deploy.sh --rollback <tag>`; data rollback by restoring the pre-deploy dump after exporting newer orders (documented, rehearsed).
