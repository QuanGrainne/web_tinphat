# Code standards

Short rules that review checks. Project-wide principles: YAGNI, KISS, DRY; real behaviour, no fake data to satisfy a check.

## Database migrations (Flyway, `apps/api/src/main/resources/db/migration`)

- Never add a NOT NULL column without a default. Expand then contract: add the column (nullable or with a default), backfill, switch the code over, drop the old shape in a later release.
- Migrations are additive and never edited once merged. Name `V<n>__<what>.sql`; ranges: V1-V13 foundation, V14-V19 catalogue, V40-V49 sales.
- Money is `bigint` VND. Timestamps are `timestamptz`. Primary keys are `bigserial`. Mutable aggregates carry `version bigint not null default 0` (JPA `@Version`).
- Every migration must apply on an empty PostgreSQL 18 (`FlywayMigrationIT`), and `ddl-auto=validate` must pass.
- Checked in review and in the go-live checklist.

## Backend

- Package by feature under `vn.dnahoangnguyen.api`; one write path per aggregate (a service method); controllers stay thin and return records, never entities.
- Failures that the user can cause: throw `DomainException` with a Vietnamese `detailVi` and a `ProblemCode`. Do not catch and swallow; do not build error bodies by hand (use `Problems`).
- Add a validation message in Vietnamese to every constraint annotation on request records; field errors reach the UI as `errors[]`.
- Audit: `AuditService.record(...)` joins the caller's transaction (it throws outside one). Non-user callers use `recordAs(AuditActor.system("NAME"), ...)`. Store snapshots (records or maps); only changed keys are kept. `action` and `entity_type` are at most 40 characters.
- Time: inject `java.time.Clock` (one bean) instead of calling `Instant.now()` in logic that tests need to move. Compare instants read from the database after truncating to microseconds.
- Jackson is 3 (`tools.jackson.*`; annotations stay in `com.fasterxml.jackson.annotation`). Hibernate does not get a JSON mapper here: map `jsonb` as `String` with `@ColumnTransformer(write = "cast(? as jsonb)")` and `columnDefinition = "jsonb"`.
- `citext` columns: a plain `col = ?` comparison is case-sensitive when the parameter is bound as text. Query with `lower(col) = lower(:value)`.
- Rate limits and client IP: `FixedWindowRateLimiter` and `ClientIpResolver` only; never read `X-Forwarded-For`.
- Roles: `@PreAuthorize("hasRole('MANAGER')")` on the controller method or service method; the URL table in `SecurityConfig` is not edited by feature modules.

## Public prices

Every public price goes through `PublicPriceRedactor`. A SKU with `priceVisible=false` has every price field `null` in every public response (listing, product, search, suggest, cart pricing, quote and order views, sitemap data, emails to customers). Hidden lines never count in computed totals. New public endpoints must be reviewed against this rule.

## Naming

- Java: PascalCase types, camelCase members, packages lower-case; tests `*Test` (pure) and `*IT` (Testcontainers), both run by `mvn test`.
- SQL and JSON: snake_case columns, camelCase JSON properties; enums are upper-case strings.
- TypeScript files: kebab-case (`order-status.ts`), components PascalCase exports.
- Copy shown to users is Vietnamese, short and polite; money as `428.500đ`, percentages as `1,9%`.

## Tests

- Pure logic (pricing, matching, state machines, throttling) gets plain unit tests with no Spring.
- Integration tests extend `support.IntegrationTest` (PostgreSQL 18 in Testcontainers shared per JVM, `MockMvc` through the real security chain, controllable `TestClock`). They share one database and one in-memory limiter: use unique usernames and client IPs per test.
- Act as an admin with `TestAuth.createUser(...)` and `.with(TestAuth.as(user))`; mutating admin calls add `.with(TestAuth.xsrf(token))`.
