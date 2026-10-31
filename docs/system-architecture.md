# System architecture

Scope: the MVP that runs on Docker (`docker compose -f deploy/compose.yml up -d --build`, then `http://localhost:8000`). Request and response shapes live in `docs/api-contract-mvp.md`; this file covers topology, security and cross-cutting behaviour.

## Topology

```
browser :8000 -> caddy -> /api/*     -> api:8080 (Spring Boot)   header_up CF-Connecting-IP {remote_host}
                       -> /uploads/* -> file_server
                       -> /*         -> web:3000 (Next standalone)
web (server side) -> http://api:8080            (env API_INTERNAL_URL)
api -> db:5432 (PostgreSQL 18)                  api -> mailpit:1025 (profile `mail`)
```

Browser calls are same-origin (`/api/...`), so there is no CORS. In production Cloudflare sits in front of Caddy and sets `CF-Connecting-IP`; Caddy emulates it in dev and compose, so rate limiting behaves the same everywhere.

## Backend layout (`apps/api`, package `vn.dnahoangnguyen.api`)

| Package | Content |
|---|---|
| `common.error` | `ProblemCode`, `DomainException`, `Problems`, `GlobalExceptionHandler` |
| `common.security` | `SecurityConfig`, `JsonAuthHandlers`, `SessionValidityFilter`, `LoginThrottleFilter`, `CurrentUser` |
| `common.ratelimit` | `FixedWindowRateLimiter` (in-memory), `ClientIpResolver` |
| `common.config` | `AsyncSchedulingConfig` (`@EnableAsync`, `@EnableScheduling`, the shared `Clock` bean) |
| `admin.user` | `AppUser`, `Role`, `AppUserDetails`, `BootstrapManagerRunner` |
| `admin.auth` | login throttle (`LoginAttemptService`), `AuthController`, `MeController`, password change |
| `admin.audit` | `AuditService`, `AuditActor`, `AuditLog` |
| `settings` | `SettingsService` over `app_setting`, public/admin settings endpoints, bank settings change |
| `notify` | `NotificationPort`; `LogNotificationAdapter` by default, an email adapter under profile `mail` |
| `catalog`, `storefront`, `sales` | added by the catalogue and sales modules, each with its own `config/<module>.yml` and migrations |

Flyway ranges: V1-V13 foundation (users, audit, settings, catalogue schema), V14-V19 catalogue additions, V40-V49 sales. `out-of-order` is on except in profile `prod`.

## Authentication and sessions

Form login with a server-side `HttpSession` (cookie `DNA_SESSION`: HttpOnly, SameSite=Lax, Secure in profile `prod`).

1. `GET /api/auth/csrf` returns 204. The `XSRF-TOKEN` cookie (readable by script) is written on every response of the admin chain.
2. `POST /api/auth/login` (form-urlencoded, header `X-XSRF-TOKEN` = cookie) returns `{username, displayName, role}`. Every failure (wrong password, unknown user, disabled user, inside a delay) is the same 401 problem body.
3. Every non-GET admin call repeats the `X-XSRF-TOKEN` header. A missing or wrong token is a 403 problem.
4. `POST /api/auth/logout` returns 204 and ends the session.

Session lifetime: idle timeout 4 h, absolute cap 12 h from login (`dna.authTime` session attribute). `SessionValidityFilter` re-reads the user (primary key) on every `/api/admin/**` request and ends the session with 401 when the user is disabled or deleted, the role differs from the session, `password_changed_at` is later than the login, or the cap passed. Changes made directly in the database therefore apply on the next request. Changing the own password re-issues only the caller's session.

Login throttling (in memory, a restart clears it): after 5 failures for a `(lower(username), client IP)` pair each further attempt waits `min(30 s * 2^(n-5), 15 min)` after the last failure and is refused without checking the password; plus 20 login attempts per IP per 10 min, then 429 `RATE_LIMITED` with `Retry-After`. Nothing is stored per user, so another address cannot lock the owner out. Client IP comes only from `dna.client-ip-header` (`CF-Connecting-IP`); `X-Forwarded-For` is ignored; IPv6 is keyed by its /64 prefix.

Passwords are `{bcrypt}` (strength `dna.security.bcrypt-strength`, default 12). Sensitive changes (own password, bank account) re-enter the current password, capped at 5 tries per 15 min per user.

## URL security (one place: `SecurityConfig`)

| Pattern | Chain | Rule |
|---|---|---|
| `/api/public/**`, `/api/webhooks/**` | public, stateless | anonymous; no CSRF, no session, no cookies; webhooks authenticate by API key inside the controller |
| `/api/auth/**` | admin | anonymous (csrf, login, logout); CSRF applies |
| `/api/admin/**` | admin | signed-in; session re-checked per request; CSRF applies to non-GET |
| `/actuator/health`, `/error` | admin | anonymous |
| everything else | admin | denied (401 when anonymous) |

Finer rules use `@PreAuthorize` on services or controller methods (`@EnableMethodSecurity`). Later modules never edit `SecurityConfig`.

## Role matrix

| Action | EDITOR | MANAGER |
|---|---|---|
| View admin, products, quotes, orders | yes | yes |
| Edit product text, SEO, category, brand; create category/brand | yes | yes |
| SKU price, promo, conversion, code, "Hiện giá/Liên hệ", needs-confirmation flag | no | yes |
| Publish, unpublish, discontinue | no | yes |
| Quote/order status (except "Đã nhận tiền"), internal note, shipping fee | yes | yes |
| Mark order PAID manually | no | yes |
| Bank review queue (view, link, dismiss) | no | yes |
| Settings (view, bank account with password re-entry) | no | yes |
| User management | no screen; SQL runbook | no screen; SQL runbook |

System actor `BANK_WEBHOOK` (no login, no `app_user` row, `audit_log.actor_id` null) may only move a confirmed bank-transfer order to PAID on an exact-match, API-key-authenticated transaction.

## Error format

Every error is `application/problem+json`:

```json
{ "type": "about:blank", "title": "Conflict", "status": 409, "detail": "Dữ liệu đã bị người khác thay đổi. Tải lại để tiếp tục.",
  "instance": "/api/admin/products/7", "code": "VERSION_CONFLICT", "errors": [{ "field": "name", "message": "..." }] }
```

`detail` is Vietnamese and safe to show; `errors` appears for validation failures; `DomainException` extensions (for example `pricedCart`) become top-level properties. Mapping: bean validation and unreadable JSON 400 `VALIDATION_FAILED`; optimistic lock 409 `VERSION_CONFLICT`; unique violation (`23505`) 409 `DUPLICATE`; foreign-key violation (`23503`) 409 `CONFLICT_STATE`; access denied 403 `FORBIDDEN` (401 when anonymous); unknown path 404 `NOT_FOUND`; anything else 500 `INTERNAL` with no stack trace. 429 carries `Retry-After`. Codes are the `ProblemCode` enum; modules only append.

## Settings (`app_setting`, jsonb)

Keys: `company`, `bank`, `pricing.mismatchThresholdPct` (default 2.0), `discount.tiers` (empty = off), `notify.ownerEmail`, `site.trustStrip`, `site.hotline`, `site.zalo`. Read through `SettingsService`; the bank account is changed only through `PUT /api/admin/settings/bank` (MANAGER, own password, audited, owner notified after commit) or seeded once from `DNA_BANK_*` when none is stored.

## Configuration owned by the foundation

| Variable | Purpose | Default |
|---|---|---|
| `SPRING_DATASOURCE_URL`, `_USERNAME`, `_PASSWORD` | database | `jdbc:postgresql://localhost:5432/dna`, `dna`, `dna` |
| `DNA_BOOTSTRAP_MANAGER_USERNAME`, `_PASSWORD` | first MANAGER, created once when `app_user` is empty (password >= 12 characters) | unset |
| `DNA_BANK_NAME`, `DNA_BANK_BIN`, `DNA_BANK_ACCOUNT_NO`, `DNA_BANK_ACCOUNT_NAME` | seed the receiving account once, when all four are set and none is stored | unset |
| `DNA_SITE_URL` | public base URL | `http://localhost:8000` |
| `DNA_SEED_CATALOGUE_ENABLED` | load the printed catalogue on start | `false` |
| `DNA_TURNSTILE_ENABLED` | bot challenge on public forms | `false` |
| `SPRING_PROFILES_ACTIVE` | `docker`, `mail` (email adapter, `SPRING_MAIL_HOST`/`PORT`), `prod` (secure cookie, ordered Flyway, ECS logs) | none |
