# Spring Boot backend research: dna-web phase 1

Date: 2026-10-29 | Scope: BE only (Spring Boot + Postgres) | Tags: **[V]** verified on primary source this session, **[S]** secondary/aggregator, **[U]** unverified.

## Bottom line (ranked choices)

- **Spring Boot 4.1.2** (GA line 4.1.0 on 2026-06-10). Not 4.2 (only RC1 on Central). Not 4.0 (OSS EOL 2026-12-31). Not 3.5 (OSS EOL 2026-06-30).
- **Java 25** (LTS). Java 21 LTS is an acceptable fallback if JDK 25 install is a problem.
- **PostgreSQL 18** (18.6). Not 19 yet: RC1 2026-10-15, GA planned 2026-11-19.
- **Single Maven module, package-by-feature, manual DTO mapping, RFC 9457 ProblemDetail.**
- **Auth: Spring Security form login + server-side HttpSession**, same-origin through Next.js rewrites. CSRF via `csrf.spa()`. Public POST endpoints exempt from CSRF but rate-limited.
- **Excel: Apache POI 6.0.0**, XSSF user model, codes read as text. Reject FastExcel (stale), EasyExcel (archived). Fesod is a fallback only.
- **Import preview: `import_batch` table** (JSONB rows), apply re-validates against current rows.
- **Price history + audit: hand-written tables in Flyway.** No Envers.
- **Images: VPS disk + nightly copy to Cloudflare R2.** Thumbnailator for resize. No MinIO.
- **Tests: Testcontainers Postgres 18.** No H2.
- **Ops: Actuator health, ECS structured logs, nightly `pg_dump -Fc`, monthly restore drill.**

## 1. Versions

| Component | Choice | Evidence | Note |
|---|---|---|---|
| Spring Boot | 4.1.2 | [V] spring.io project page shows 4.1.2; [V] docs.spring.io/spring-boot/system-requirements.html documents 4.1.2; [V] Central metadata lists 4.1.2 | 4.1.0 GA [V] https://spring.io/blog/2026/06/10/spring-boot-4/ ; 4.1.1 [V] https://spring.io/blog/2026/08/20/spring-boot-4-1-1-available-now/ |
| Boot OSS support | 4.1 to 2027-07-31; 4.0 to 2026-12-31; 3.5 ended 2026-06-30 | 3.5 EOL [V] https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now/ ("last OSS release"); dates [S] https://endoflife.date/spring-boot | spring.io support page not readable by tool |
| Java | 25 (LTS) | [V] https://adoptium.net/temurin/releases/ lists JDK 25 as LTS; [S] Premier to 2030-09-30, Extended to 2033-09-30 https://endoflife.date/oracle-jdk | Boot 4.1.2 min Java 17, "compatible up to and including Java 27" [V] |
| Java 21 | fallback | [S] Extended to 2031-09-30 | Installed locally |
| Java 27 | reject | [S] GA 2026-09-15, non-LTS | Java 26 past Premier support |
| Spring Framework / Security / Data | 7.0.10 / 7.1.2 / 2026.0.2 | [V] Boot 4.1.2 BOM pom on Central https://repo1.maven.org/maven2/org/springframework/boot/spring-boot-dependencies/4.1.2/spring-boot-dependencies-4.1.2.pom | Use BOM-managed versions |
| Hibernate ORM | 7.4.13.Final (BOM) | [V] same pom | 8.0.0.Beta4 exists, do not use |
| Flyway | 12.4.0 (BOM) | [V] same pom | Central latest flyway-core is 13.11.1 (2026-10-21) [V]. Do not override BOM yet |
| Testcontainers | 2.0.5 (BOM) | [V] same pom + Boot testing docs | Java module artifacts are `testcontainers-<module>` [S] |
| PostgreSQL | 18.6 | [V] https://www.postgresql.org/support/versioning/ (18.6, initial 2025-09-25, EOL 2030-11-14) | 14 EOL 2026-11-12: avoid. 19 RC1 [V] https://www.postgresql.org/about/news/postgresql-19-rc-1-released-3409/ |
| PostgreSQL JDBC | 42.7.14 (BOM) | [V] same pom | |

Starters (Boot 4 modular) [V] https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide: `spring-boot-starter-webmvc`, `-data-jpa`, `-validation`, `-security`, `-flyway` (module `spring-boot-flyway`), `-jackson`. Test starters: `spring-boot-starter-<x>-test`. Jackson is 3 (`tools.jackson`).

Ranked: (1) Boot 4.1.2 + Java 25 + PG 18. (2) Same with Java 21. (3) Boot 4.2 after GA. Rejected: 4.0, 3.5, Java 27, PG 19 before GA + first minor.

## 2. Project layout

- **Single Maven module.** One deployable, ~15 entities, no second consumer. Multi-module adds reactor cost with no benefit. [inference]
- **Package-by-feature:** `catalog` (brand, category, product, sku), `pricing` (price_history, promo), `quote`, `order`, `content`, `media`, `kiotviet` (import), `settings`, `admin` (users, audit_log), `common` (errors, config). Each holds entity, repo, service, controller, records.
- **DTO mapping, ranked:** (1) manual Java records with `static from(entity)`. (2) MapStruct 1.6.3, the latest GA on Central [V] https://repo1.maven.org/maven2/org/mapstruct/mapstruct/maven-metadata.xml (1.7.0.Beta2 is pre-release). Pick (1). Switch to (2) only past ~20 mappers.
- **Validation:** Bean Validation on request records. Business rules (price mismatch) return warnings, not 400s, so they stay in services.
- **Errors:** RFC 9457 [V] https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-ann-rest-exceptions.html. Extend `ResponseEntityExceptionHandler`. Add a non-standard `code` property via the ProblemDetail properties map for Next.js to branch on. Boot property `spring.mvc.problemdetails.enabled` exists [V].

## 3. Auth (1-2 admins, public read)

| Rank | Option | Verdict |
|---|---|---|
| 1 | Spring Security form login, server-side HttpSession (in-memory), same origin via Next.js rewrites | **Pick.** Logout = real revocation. No token code. Restart logs admins out, acceptable for 2 users. Single JVM only, which is the deployment anyway |
| 2 | Option 1 + Spring Session JDBC (sessions in Postgres) | Add only if restart logouts annoy. Property `spring.session.jdbc.initialize-schema` default `embedded` [S, Spring Session 4.1 guide]; Boot 4.1 page not readable [U] |
| 3 | JWT in Bearer header via Next.js BFF | Reject. Refresh/revocation logic and token storage for zero gain on a same-origin app |

- **CSRF:** on by default for unsafe methods, session-backed [V] https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html. For SPA use `csrf.spa()` (one call) [V]. Cookie `XSRF-TOKEN`, header `X-XSRF-TOKEN`. Cookie is cleared on login/logout, so the client must refetch the token [V].
- **Public POST endpoints** (quote, order, contact) are unauthenticated, so CSRF protects nothing there. Exempt `/api/public/**` via `ignoringRequestMatchers` [V pattern]. Protect them with rate limit + honeypot field. Bot challenge (e.g. Turnstile) not researched [U].
- **Next.js rewrites:** docs describe rewrites as a URL proxy [V] but do not document cookie, Host, or X-Forwarded-For forwarding [U]. Test end-to-end. Set Spring forwarded-header handling for client IP [U, verify property in 4.1 docs].
- **Passwords:** `DelegatingPasswordEncoder` stores `{id}hash` [V]. Use bcrypt (default in the docs' examples, no extra dependency). Argon2 is preferred by the Spring docs for new apps [V] but needs Password4j or Bouncy Castle [S]. Pick bcrypt unless the user wants Argon2. Tune work factor to about 1 s/verify [V].
- **Roles:** two authorities (EDITOR, MANAGER). Enforce by URL rules plus `@PreAuthorize` on price, delete, publish, settings.
- **Brute force:** no built-in lockout found in Spring Security docs or search; 7.1 specifically [U]. Pick: in-app counter of failures per username via `AuthenticationFailureEvent`, temporary lock. Add edge rate limit on `/login` if Cloudflare allows it. Free-plan rule count conflicts across sources [U]. Trade-off: per-user lock lets an attacker lock the 2 admins out; acceptable with an IP limit at the edge.

## 4. Excel import (KiotViet, ~69 SKUs, ~100 rows)

**Library, ranked:**

| Rank | Lib | Latest | Status | Verdict |
|---|---|---|---|---|
| 1 | Apache POI 6.0.0 | Central 2026-10-19 [V]; news 2026-10-22 [V] https://poi.apache.org/ | Mature. Java 17+ [V]. No breaking-change list on news page [U] | **Pick.** Fallback pin 5.5.1 (on Central [V]) if 6.0.0 regresses |
| 2 | Apache Fesod (`org.apache.fesod`) 2.1.0-incubating | 2026-10-07 [V] https://fesod.apache.org/blog/tags/release | Incubating, not graduated [V] | Only if POI is too verbose. Adoption risk: incubator |
| 3 | FastExcel 1.3.0 | Central 2025-08-22 [V] | No 2026 release found [V metadata] | Reject: stale |
| 4 | EasyExcel | Archived [S] | Reject |

**Reading rules (POI):**
- Read the code column with `DataFormatter`, and reject any NUMERIC code cell with "mã dạng số, có thể mất số 0 đầu". Excel has already stripped the zeros, and formatting cannot restore them [V, Microsoft page in prior KiotViet report].
- Normalise keys: `Normalizer.normalize(s, NFC)`, trim, collapse internal whitespace, `toUpperCase(Locale.ROOT)`. Keep the raw string. Flag case-only or whitespace-only collisions instead of merging. [inference]
- Price: numeric cell → `BigDecimal` directly. Text → strip separators per the locale seen in the sample. Store VND as integer (`bigint`), never double.
- Streaming (SAX event API [V https://poi.apache.org/components/spreadsheet/how-to.html]) and SXSSF are not needed at 100 rows. YAGNI.
- POI ZipSecureFile zip-bomb limits apply on read; defaults are fine for a small file [S].
- CSV fallback only if KiotViet exports CSV. Then commons-csv 1.14.1 (latest on Central [V]). Otherwise skip.

**Preview-then-apply, ranked:**
1. `import_batch` table: id, file_sha256, created_by, status (PREVIEW / APPLIED / CANCELLED), rows as JSONB (raw row, key, action, diff). Apply re-reads each target SKU and checks `@Version`. Changed rows become conflicts. Survives restart, gives audit trail, small.
2. In-memory token map with TTL. Lost on restart, no audit, fails silently. Reject.
3. Per-row staging tables. More schema for 69 rows. Reject (YAGNI).

Keep the diff as a pure function `(parsed rows, current catalogue) -> diff`. Unit-test it without Spring.

## 5. Audit and price history

| Rank | Option | Verdict |
|---|---|---|
| 1 | Hand-written `price_history` and `audit_log` tables, written in the same transaction by the service | **Pick.** Explicit, queryable, no framework magic. `price_history(sku_id, old_price, new_price, changed_by, changed_at, source MANUAL/EXCEL, batch_id)`. `audit_log(actor, action, entity_type, entity_id, before jsonb, after jsonb, at)` |
| 2 | Spring Data auditing (`@CreatedBy`, `@LastModifiedBy` + `AuditorAware`) | Use alongside #1 for created/updated columns only. Gives no old/new values |
| 3 | Hibernate Envers | Skip for phase 1. Artifact exists on Central (7.4.14.Final) [V]. Needs REVINFO and `_AUD` tables, which practitioners advise writing by hand in Flyway [S]. Full-entity revisions exceed the spec [inference] |

## 6. Images

**Storage, ranked:**
1. VPS volume + nightly copy to Cloudflare R2 (rclone, unverified version). R2 standard storage $0.015/GB-month, 10 GB free, no egress fee [V] https://developers.cloudflare.com/r2/pricing/. At ~69 SKUs plus banners, cost is near zero. No S3 SDK or presign needed.
2. Direct S3-API writes to R2 via AWS SDK. Adds credentials and a dependency. Only if VPS disk is not durable.
3. MinIO: reject. Community edition in maintenance mode, binaries stopped, admin console removed [S, several secondary reports; repo not verified directly].

**Resize:** Thumbnailator 0.4.21 (last Central release 2025-10-02 [V]), wraps ImageIO. libvips needs a native lib on the VPS, which adds ops work. Reject for phase 1. ImageIO does not decode WebP [U, general knowledge]: accept JPEG/PNG only in phase 1.

**Validation:** check magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`), not the extension. Size cap (e.g. 5 MB). Cap pixel dimensions before decode to block decompression bombs. Re-encode to strip EXIF. Name files by sha256. These caps are proposed, not from a source.

**Serving:** immutable content-hash URLs with long Cache-Control. Cloudflare caches them. Pre-generate 2-3 sizes so no on-demand resize is needed. [inference]

## 7. Testing

- **Testcontainers (pick):** `testcontainers-postgresql`, `testcontainers-junit-jupiter`, `spring-boot-testcontainers`. `@ServiceConnection` on a `PostgreSQLContainer` replaces `@DynamicPropertySource` [V https://docs.spring.io/spring-boot/reference/testing/testcontainers.html]. Image `postgres:18` to match prod.
- **H2: reject.** H2's PostgreSQL mode is a partial emulation ("only a small subset of the differences... implemented") [V https://h2database.com/html/features.html]. Partial-index and constraint gaps reported [S]. Flyway migrations with JSONB and partial unique indexes may not run at all. Green H2 tests give false confidence.
- **Slices:** `@WebMvcTest` for controllers and security (needs `spring-boot-starter-security-test` for `@WithMockUser` [V migration guide]). `@DataJpaTest` with `@AutoConfigureTestDatabase(replace = NONE)` on Testcontainers. One `@SpringBootTest` that runs all Flyway migrations on an empty PG and the import flow end to end.
- **Pure unit tests (no Spring):** import diff (new / price-changed / unchanged / discontinued / mismatch, key collisions); price-mismatch `|listed - unit*qty| / (unit*qty) > threshold` (threshold is a business decision); saving % `round((retail - wholesale)/retail*100)`, HALF_UP, guard retail = 0. Money in `BigDecimal` or long, never double.

## 8. Ops (one VPS)

- **Actuator:** `spring-boot-starter-actuator`. Expose only `health` publicly. Block other actuator paths at Nginx/Cloudflare. Property names for 4.1 not re-verified [U].
- **Logs:** `logging.structured.format.console=ecs` [V https://docs.spring.io/spring-boot/reference/features/logging.html]. Rotate via Docker log driver limits.
- **Backups:** `pg_dump -Fc` (custom format, compressed by default) [V https://www.postgresql.org/docs/18/app-pgdump.html]. Run pg_dump from the PG 18 client, since pg_dump must be the same or newer major than the server [V]. Encrypt dumps before upload to R2 (gpg or age) [general, U]. Keep 14 daily, 3 monthly [policy, inference]. Run a restore into a scratch container monthly. An untested backup is not a backup.
- **Memory:** 4 GB VPS per tech-stack doc. Cap JVM heap via `MaxRAMPercentage` [U, measure].

## 9. Adoption risk and limitations

- **Boot 4.1:** GA Jun 2026, OSS to Jul 2027. Low risk for a new project. **POI 6.0.0:** 11 days old, pin and keep 5.5.1 as fallback. **FastExcel/EasyExcel:** stale/archived. **Fesod:** incubating. **MinIO:** abandoned. **Testcontainers 2.x:** artifact rename vs 1.x, follow BOM. **Hibernate 8 / Flyway 13 / Java 27:** not for this stack yet.
- No real KiotViet export: parser columns and price VAT meaning unverified (carried from prior report).
- Not verified: Spring Session 4.1 docs (404 via tool), Spring Security 7.1 brute-force support, Next.js header forwarding, Cloudflare Free rate-limit rule count, Envers DDL, Boot 4.1 Actuator/forwarded-header property names. Support dates from endoflife.date [S]; Oracle roadmap returned 403.
- No live tests or benchmark; VPS RAM not measured. Not covered: PDF quotes, Vietnamese full-text search, payment QR, Zalo/email notifications.

## Unresolved questions

1. Real KiotViet export: exact headers, one-row-per-unit-code or not, price VAT meaning, status column. Blocks parser design.
2. Does "Gói" in "SV465-4L- Gói" belong to the code? Need 5-10 real messy codes to set the normalisation rules.
3. Price-mismatch threshold: percent or VND?
4. Are logouts on backend restart acceptable (decides HttpSession vs Spring Session JDBC)?
5. Is Cloudflare rate limiting available on the chosen plan, and enough for `/login` and public POSTs?
6. Bot protection for public forms (CAPTCHA / Turnstile): include in phase 1?
7. Confirm VND has no decimals (integer `bigint` prices).
8. Install JDK 25 on the dev machine, or stay on Java 21?
9. Does `spring-boot-starter-flyway` pull `flyway-database-postgresql` in 4.1.2? Verify in the build.
10. Saving % rounding rule and whether it combines with promo prices (already open in requirements-decisions).

Status: DONE_WITH_CONCERNS
Summary: Pick Spring Boot 4.1.2, Java 25, PostgreSQL 18; single Maven module with package-by-feature; session-cookie admin auth via same-origin rewrites; POI 6.0.0 import with a staged `import_batch` preview; hand-written price/audit tables; local disk plus R2 backup for images; Testcontainers, no H2.
Concerns/Blockers: No real KiotViet export, so the import parser is unverified. Several auth and Next.js proxy details (Spring Session docs, brute-force in Security 7.1, Next.js header forwarding) are unverified. Spring.io support page was not readable, so support dates come from endoflife.date.
