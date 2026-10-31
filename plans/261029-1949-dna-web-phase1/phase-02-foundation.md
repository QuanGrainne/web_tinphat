---
phase: 2
title: "Foundation"
status: pending
priority: P1
effort: "1.75-2.25 pw (estimate; +0.25 for session re-check, progressive login delay, CF client IP)"
dependencies: []
---

# Phase 2: Foundation

## Overview

Monorepo skeleton both apps build on: Maven API with Flyway baseline, auth (2 roles), audit log, settings store, RFC 9457 errors; Next app with two root layouts, admin shell + login; dev Compose (Postgres 18 + Caddy in front, same topology as prod); CI skeleton (build + test only). Ends with: an admin logs in at `http://localhost:8000/admin/login` and sees an empty KiotViet-style shell.

## Requirements

<!-- Updated: Validation Session 1 - single MANAGER account at launch; session/login judgement calls owner-confirmed -->
- Functional: login/logout, `GET /api/admin/me`, change own password, bootstrap first MANAGER from env (the only account at launch; EDITOR role exists but is unused [V3]; no users screen in phase 1, account changes by SQL runbook [D2]), progressive login delay keyed on (username, IP) [RT#2], live sessions killed by disable / role change / password reset made in the DB [RT#3].
- Non-functional: same-origin cookies (no CORS), CSRF on admin mutations, every error is `application/problem+json` with a `code`, all migrations run on empty PG 18 in CI, Windows dev works (`.gitattributes` forces LF for `*.sh`).
- Migration rule [RT#12]: never add a NOT NULL column without a default; expand-then-contract (add -> backfill -> use -> drop in a later release). Written in `docs/code-standards.md`, checked in review and in the phase-8 go-live checklist.

## Architecture

```
Browser :8000 ──> Caddy (deploy/caddy/Caddyfile.dev)
                   ├─ /api/*      -> host:8080  Spring Boot (dev profile, run from IDE/mvn)
                   │                 header_up CF-Connecting-IP {remote_host}   [RT#5: emulates Cloudflare]
                   ├─ /uploads/*  -> ./data/uploads (file_server)      [used from phase 3]
                   └─ /*          -> host:3000  Next dev
Spring ──JDBC──> db (postgres:18, 127.0.0.1:5432)
```

Backend packages (`apps/api/src/main/java/vn/dnahoangnguyen/api/`): `common` (error, security, ratelimit, persistence, config), `admin` (user, audit), `settings`. Later phases add `catalog`, `media`, `kiotviet`, `storefront`, `sales` (quote, order), `content` (no `dashboard` package: owner decision A).

Auth flow: `GET /api/auth/csrf` (sets `XSRF-TOKEN`) -> `POST /api/auth/login` (form-urlencoded, header `X-XSRF-TOKEN`) -> JSON 200 `{username, displayName, role}` or 401 problem; session cookie `DNA_SESSION` (HttpOnly, SameSite=Lax, Secure in prod). Unauthenticated `/api/admin/**` -> 401 problem, never a redirect.

Session lifetime [RT#3]: idle timeout 4 h (was 12 h; an absolute cap makes a 12 h idle window pointless) + absolute cap 12 h from login (decided: owner-confirmed [V5]) (`authTime` stored in the session). `SessionValidityFilter` runs on every authenticated `/api/admin/**` request: loads `app_user(enabled, role, password_changed_at)` by id (one PK read; admin traffic is tiny) and invalidates the session -> 401 `UNAUTHENTICATED` when the user is disabled, the role differs from the session authority, `password_changed_at > authTime`, or `now - authTime > 12 h`.

Login throttling [RT#2]: `LoginAttemptService` keeps an in-memory map (restart clears it; decided: owner-confirmed [V5]) keyed on `(lower(username), clientIp)` (bounded 10k keys, entries purged 24 h after last failure). After 5 failures each further attempt must wait `min(30 s x 2^(n-5), 15 min)` after the last failure; an attempt inside the wait is rejected without checking the password. Wrong password, unknown user, disabled user and "waiting" all return the **identical** 401 body (`code=UNAUTHENTICATED`, same `detail`); unknown users still cost one bcrypt verify (Spring `DaoAuthenticationProvider` timing mitigation). Separate per-IP limit 20 / 10 min -> 429 `RATE_LIMITED` with `Retry-After`. Nothing is stored per user, so an attacker cannot lock the owner out from another IP. Out-of-band recovery (restart `api` clears all delays; SQL password reset / re-enable) is documented in `docs/deployment-guide.md` (phase 8); there is no in-app unlock (users screen deferred [D2]).

URL security (written once here so later phases never edit `SecurityConfig`): `/api/public/**` permitAll + CSRF ignored; `/api/webhooks/**` permitAll + CSRF ignored, no session, authenticated inside the controller by vendor API key (phase-6 SePay webhook [W1]); `/api/auth/**` permitAll; `/api/admin/**` authenticated; `/actuator/health` permitAll; everything else denyAll. Fine-grained rules via `@PreAuthorize` in services.

Role matrix (canonical; later phases cite it):

| Action | EDITOR | MANAGER |
|---|---|---|
| View admin, products, quotes, orders | yes | yes |
| Edit product text/images/SEO/category/brand, create category/brand | yes | yes |
| Change SKU price, promo, conversion, code, "Hiện giá/Liên hệ" | no | yes |
| Publish, unpublish, discontinue; delete/merge category, brand, draft | no | yes |
| Import preview / apply | yes / no | yes / yes |
| Quote/order status (except "Đã nhận tiền"), assignee, notes, shipping fee | yes | yes |
| Mark order PAID ("Đã nhận tiền") manually [RT#6] | no | yes |
| Bank transaction REVIEW queue: view, link to order, dismiss [W2] | no | yes |
| Posts, pages, home blocks | yes | yes |
| Settings (incl. bank, with password re-entry [RT#6]) | no | yes |
| User management | no screen (deferred [D2]); SQL runbook by the developer (phase 8) | same |

System actor (no login, no session, no `app_user` row) [W2]: `BANK_WEBHOOK` may only move a BANK_TRANSFER order CONFIRMED -> PAID on an exact-match, API-key-authenticated SePay transaction (phase 6); it can do nothing else. **RT#6 amended by owner decision W2: PAID may be set by MANAGER or by the authenticated exact-match webhook.** Audit rows for it carry `actor_id` null, `actor_name` `BANK_WEBHOOK`.

Error body: `{type, title, status, detail (Vietnamese), instance, code, errors?: [{field, message}]}`. Codes (enum `ProblemCode`): `VALIDATION_FAILED, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, VERSION_CONFLICT, DUPLICATE, RATE_LIMITED, CONFLICT_STATE, FILE_REJECTED, INTERNAL`. Later phases append codes to the enum only.

Data (Flyway `V1__users_audit_settings.sql`):
- `app_user(id bigserial, username citext unique, password_hash, display_name, role varchar check in ('EDITOR','MANAGER'), enabled, password_changed_at timestamptz not null default now(), created_at, updated_at)` [RT#2, RT#3: no per-user lock columns]
- `audit_log(id bigserial, actor_id fk null, actor_name, action varchar(40), entity_type varchar(40), entity_id bigint, before jsonb, after jsonb, at timestamptz default now())` + index `(entity_type, entity_id, at desc)`
- `app_setting(key varchar(80) pk, value jsonb not null, updated_by, updated_at)`
- `V2__seed_settings.sql`: company name, MST 5400533724, head office, warehouse, phone 0366 985 679, email (from `docs/catalogue-text.txt:509-520`), `pricing.mismatchThresholdPct = 2.0`, `bank.*` placeholders, `discount.tiers = []`, `notify.ownerEmail` placeholder [RT#6].
- Extension `citext` (and `unaccent` not used: folding is done in Java).

Rate limiter: `FixedWindowRateLimiter` (in-memory `ConcurrentHashMap`, key + window, scheduled purge via `AsyncSchedulingConfig`). Used for login here; public forms reuse it in phase 6. Client IP [RT#5]: `ClientIpResolver` reads `CF-Connecting-IP` from day one (header name configurable `dna.client-ip-header`); dev Caddy sets it from the TCP peer so dev and prod behave the same; prod Cloudflare sets it and Authenticated Origin Pulls (phase 8) guarantee every request came through Cloudflare; missing header -> remote address + warn log. IPv6 addresses are keyed on their /64 prefix for rate limiting.

## Related Code Files

Create (root): `D:\dna-web\README.md`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.github\workflows\ci.yml`, `deploy\compose.dev.yml`, `deploy\caddy\Caddyfile.dev`, `deploy\.env.example`, `docs\system-architecture.md`, `docs\code-standards.md`

Create (api, under `D:\dna-web\apps\api\`): `pom.xml`, `mvnw`, `mvnw.cmd`, `.mvn\wrapper\maven-wrapper.properties`, `src\main\resources\application.yml`, `application-dev.yml`, `application-prod.yml`, `db\migration\V1__users_audit_settings.sql`, `V2__seed_settings.sql`; Java under `src\main\java\vn\dnahoangnguyen\api\`: `ApiApplication.java`, `common\error\ProblemCode.java`, `DomainException.java`, `GlobalExceptionHandler.java`, `common\security\SecurityConfig.java`, `JsonAuthHandlers.java`, `CurrentUser.java`, `SessionValidityFilter.java` [RT#3], `common\ratelimit\FixedWindowRateLimiter.java`, `ClientIpResolver.java`, `common\persistence\JpaAuditingConfig.java`, `common\config\AsyncSchedulingConfig.java` (moved here from phase 5 [RT#13]: rate-limit purge, later async mail), `admin\user\AppUser.java`, `Role.java`, `AppUserRepository.java`, `AppUserDetailsService.java`, `LoginAttemptService.java`, `BootstrapManagerRunner.java`, `AuthController.java`, `MeController.java`, `admin\audit\AuditLog.java`, `AuditLogRepository.java`, `AuditService.java`, `AuditActor.java` [W2], `settings\AppSetting.java`, `AppSettingRepository.java`, `SettingsService.java`

Create (web, under `D:\dna-web\apps\web\`): `package.json`, `tsconfig.json`, `next.config.ts` (`output: 'standalone'`), `eslint.config.mjs`, `vitest.config.ts`, `proxy.ts`, `app\(storefront)\layout.tsx`, `app\(storefront)\page.tsx` (placeholder), `app\(admin)\layout.tsx` (root: `<html lang="vi">`, AntdRegistry, ConfigProvider vi_VN + tokens), `app\(admin)\admin\page.tsx` (empty placeholder; phase 3 turns it into a redirect to the product list), `app\(admin)\admin\login\page.tsx`, `components\admin\admin-shell.tsx` (white util bar + blue `#0041C5` menu with 5 items Hàng hóa / Báo giá & đơn hàng / Nội dung / Đồng bộ KiotViet / Cài đặt + "Xem website"; no "Tổng quan", owner decision A), `lib\admin\api-client.ts`, `lib\admin\use-session.ts`, `lib\admin\theme.ts`

## Implementation Steps

1. Root files; `.gitattributes`: `* text=auto`, `*.sh text eol=lf`, `mvnw text eol=lf`.
2. `pom.xml`: parent `spring-boot-starter-parent:4.1.2`, `java.version=21`; starters `webmvc, data-jpa, validation, security, flyway, actuator, jackson`; `flyway-database-postgresql` (verify whether starter already pulls it, BE report Q9); `org.postgresql:postgresql`; test: `spring-boot-starter-test`, `spring-boot-starter-security-test`, `spring-boot-testcontainers`, `testcontainers-postgresql`, `testcontainers-junit-jupiter`. POI/Thumbnailator/Mail come in phases 3 and 6.
3. `application.yml`: `spring.jpa.open-in-view=false`, `ddl-auto=validate`, `spring.mvc.problemdetails.enabled=true`, session cookie settings (idle 4 h), `server.forward-headers-strategy=framework`, Jackson dates ISO, `spring.jackson.time-zone=Asia/Ho_Chi_Minh`; actuator exposes `health` only; `logging.structured.format.console=ecs` in prod profile. `application-dev.yml` and the test config set `spring.flyway.out-of-order=true` (phases run 1,2,3,5,6,7,4 so V20-29 lands after V40-59 on dev DBs) [RT#12]; prod keeps the default `false`.
4. Migrations V1, V2 as in Architecture.
5. Error handling: `GlobalExceptionHandler extends ResponseEntityExceptionHandler`; map `MethodArgumentNotValidException` -> `VALIDATION_FAILED` with `errors[]`, `OptimisticLockingFailureException` -> 409 `VERSION_CONFLICT`, `DataIntegrityViolationException` by SQLState: `23505` (unique) -> 409 `DUPLICATE`, `23503` (FK) -> 409 `CONFLICT_STATE` [contract fix], other -> 500 `INTERNAL`; `AccessDeniedException` -> 403, `DomainException` -> its status/code. Never leak stack traces.
6. Security: `SecurityConfig` per URL table; `formLogin().loginProcessingUrl("/api/auth/login")` with `JsonAuthHandlers` (success/failure/entry point/access denied write problem JSON; failure handler emits one body for every failure cause); `csrf(c -> c.spa().ignoringRequestMatchers("/api/public/**"))`; `@EnableMethodSecurity`; `DelegatingPasswordEncoder` default (bcrypt), tune strength so one verify is ~0.3-1 s on the VPS. Register `SessionValidityFilter` after the security context filter; store `authTime` + role in the session at login; password change sets `password_changed_at = now()` and re-issues the caller's own session.
7. `LoginAttemptService` per Architecture (progressive delay keyed on username + IP; listens to failure/success events; success clears the key) + per-IP 20 / 10 min limit.
8. `BootstrapManagerRunner`: if `app_user` empty and env `DNA_BOOTSTRAP_MANAGER_USERNAME/PASSWORD` set (password >= 12 chars) create MANAGER; otherwise log a warning. Audit `USER_BOOTSTRAP`.
9. `AuditService.record(action, entityType, entityId, before, after)` joins the caller's transaction (`Propagation.MANDATORY`) so audit rows never exist without the change. Store only changed fields. Actor = current user, or an explicit system actor (`AuditActor.system("BANK_WEBHOOK")`: `actor_id` null, `actor_name` set) for non-HTTP-user callers [W2].
10. `SettingsService`: typed getters with defaults (`mismatchThresholdPct()`, `company()`, `bank()`, `discountTiers()`, `ownerEmail()`); read-only here, admin UI in phase 7.
11. Web: create Next 16 app (TypeScript, App Router, no Tailwind); two root layouts; `proxy.ts` matcher `/admin/:path*`, skip `/admin/login`, redirect when `DNA_SESSION` cookie absent. `api-client.ts`: reads `XSRF-TOKEN` cookie, sets header, parses problem JSON, 401 -> `/admin/login?next=...`, 409 `VERSION_CONFLICT` -> standard antd message "Dữ liệu đã bị người khác thay đổi. Tải lại để tiếp tục."
12. Spike (half day, before building screens): antd 6 + `@ant-design/nextjs-registry` SSR styles under Next 16; 404 handling with two root layouts (needs `global-not-found` or per-group `not-found`); how to make a route render per request while its `fetch` keeps a 60 s data cache (`await connection()` vs route segment config vs Cache Components) [RT#9, RT#13] [U for 16.4]. Record the outcome in `docs/code-standards.md`.
13. Dev Compose + Caddyfile.dev per diagram; README "Run locally": `docker compose -f deploy/compose.dev.yml up -d`, `apps/api/mvnw spring-boot:run -Dspring-boot.run.profiles=dev`, `npm run dev` in `apps/web`, open `http://localhost:8000`.
14. CI `ci.yml` (push + PR; build + test only, no deploy) [RT#12]: job `api` (temurin 21, Maven cache, `./mvnw -B verify` in `apps/api`; Docker is available on `ubuntu-latest` for Testcontainers); job `web` (Node 24, `npm ci`, `lint`, `typecheck`, `test`, `build` with `API_INTERNAL_URL=http://127.0.0.1:9` so the build proves it needs no API [RT#9]). Note: FE report s.6 assumed a different build tool; Maven is the decision.
15. `docs/code-standards.md`: migration rule (Requirements) + "every public price goes through `PublicPriceRedactor`" (phase 5) as review checklist items.

## Tests

API (`apps/api/src/test/java/vn/dnahoangnguyen/api/`):
- `support/PostgresTestcontainer` (`@ServiceConnection`, `postgres:18`), shared base `IntegrationTest`.
- `FlywayMigrationIT`: all migrations apply on empty DB; `ddl-auto=validate` passes.
- `AuthFlowIT`: csrf -> login ok -> `/api/admin/me` returns role -> logout -> `/api/admin/me` 401 problem; login without XSRF header -> 403.
- `LoginThrottleIT` [RT#2]: 5 bad passwords from IP A -> 6th attempt (even correct password) inside the delay -> 401 with body byte-identical to the wrong-password and unknown-user bodies; same username from IP B logs in fine; after clock advance past the delay -> ok; 21st attempt from one IP in 10 min -> 429.
- `SessionValidityIT` [RT#3]: (direct repository updates) disabled user's existing cookie -> 401 on next request; MANAGER demoted to EDITOR -> next request (any endpoint) 401, session gone; after re-login `/me` shows EDITOR and MANAGER-only calls 403; password changed elsewhere -> old session 401; session older than 12 h (clock) -> 401 even if active.
- `RoleAccessIT`: EDITOR gets 403 problem on a `@PreAuthorize("hasRole('MANAGER')")` test endpoint (test-only controller), MANAGER 200.
- `PublicCsrfExemptIT`: POST to `/api/public/**` and `/api/webhooks/**` test endpoints without token is not 403 and creates no session cookie on the webhook path.
- `ProblemDetailFormatTest`: validation error body has `code=VALIDATION_FAILED`, `errors[0].field`, content type `application/problem+json`; FK violation -> 409 `CONFLICT_STATE`, unique violation -> 409 `DUPLICATE`.
- `FixedWindowRateLimiterTest` (pure): N allowed, N+1 denied, new window resets.
- `ClientIpResolverTest` [RT#5]: uses `CF-Connecting-IP`; client `X-Forwarded-For` ignored; missing header -> remote address; two IPv6 addresses in one /64 -> same limiter key.
- `AuditServiceIT`: record outside a transaction throws; inside, row persisted with diff only; system actor -> `actor_id` null, `actor_name=BANK_WEBHOOK`.
- `BootstrapManagerRunnerTest`: creates once, never twice, rejects short password.

Web (Vitest): `lib/admin/api-client.test.ts` parses problem JSON, attaches XSRF header, maps 401 to redirect.

## Success Criteria

- [ ] `./mvnw verify` and `npm run build` green locally (Windows) and in CI; web build passes with no API reachable.
- [ ] Login at `http://localhost:8000/admin/login` -> shell with 5 menu items; logout works; 5 wrong passwords -> progressive delay with the same 401 message; another IP unaffected.
- [ ] Disabling a user or changing their role takes effect on their next request (`SessionValidityIT`).
- [ ] Any API error returns problem JSON with `code`.
- [ ] `docs/system-architecture.md` has the topology diagram, role matrix and error format; `docs/code-standards.md` has the migration rule.

## Risk Assessment

| Risk | L x I | Mitigation |
|---|---|---|
| antd 6 SSR styles / Next 16 multi-root 404 quirks | M x M | Spike in step 12 before screen work; fallback: admin pages fully client-rendered |
| Testcontainers on Windows Docker Desktop flaky | L x M | Docker 29.5 installed; CI Linux is the gate |
| Boot 4 modular starters missing a module (Flyway PG) | M x L | `FlywayMigrationIT` fails fast; add module explicitly |
| Admin lockout DoS (attacker locks out the owner) [RT#2] | L x M | Delay keyed on (username, IP), not username; out-of-band recovery documented (restart `api` clears delays; SQL password reset / re-enable) |
| Single MANAGER account, no backup [V3] | L x H | **Owner accepted risk: single account, recovery needs server access.** Recovery runbook (phase 8); no users screen, so the account cannot be disabled from the UI [D2] |
| Per-request user reload adds DB load [RT#3] | L x L | One PK read per admin request; admin traffic is a few users |
| Out-of-order Flyway hides a real ordering bug on dev [RT#12] | L x M | Prod keeps `out-of-order=false`; first prod deploy applies all versions in order |

<!-- Updated: Validation Session 1 - second-MANAGER mitigation removed, single-account accepted risk added -->
<!-- Updated: Validation Session 2 - /api/webhooks/** URL rule, BANK_WEBHOOK system actor, REVIEW queue row in role matrix -->
<!-- Updated: Validation Session 3 - D2: no in-app unlock, user management row in matrix; SessionValidityIT unchanged (direct DB updates) -->

Effort unchanged (the URL rule and system actor are a few lines; webhook effort is booked in phase 6).

Rollback: new repo, nothing deployed; revert commits.
