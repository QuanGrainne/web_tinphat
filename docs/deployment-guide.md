# Deployment guide: Docker stack

> The site now runs as the Tín Phát Decor catalogue. Read [tinphat-catalogue.md](tinphat-catalogue.md) first: seeding, smoke checks and the sales flow differ from what is described below.

Local and demo stack for the DNA web MVP: storefront, admin, API, PostgreSQL and a mail catcher behind Caddy. Production hardening (VPS, Cloudflare, off-site backups, automatic revert) is not part of it, see [Known limits](#11-known-limits-and-what-is-cut).

```
browser :8000 -> caddy -> /api/*     -> api:8080   (Spring Boot, PostgreSQL 18, mail to mailpit:1025)
                       -> /uploads/* -> files from the uploads volume
                       -> everything -> web:3000   (Next.js; server side calls http://api:8080)
```

Commands run from the repository root (`D:\dna-web`) in PowerShell or Git Bash. Scripts and the runbook snippets need bash (Git Bash or WSL).

## 1. Prerequisites

- Docker Desktop (Compose v2). Give it at least 4 GB RAM (8 GB comfortable): the API heap is capped at 512 MB, Node at 384 MB.
- Free host ports: 8000 (site), 8025 (Mailpit), 55432 (database, debugging).
- Git Bash or WSL for `scripts/*.sh`.
- First time only: `cp deploy/.env.example deploy/.env` (the file is gitignored; the dev values work as they are).

## 2. Start, stop, rebuild, logs

| Task | Command |
|---|---|
| Build and start everything | `docker compose -f deploy/compose.yml up -d --build` |
| Status and health | `docker compose -f deploy/compose.yml ps` |
| Follow logs | `docker compose -f deploy/compose.yml logs -f api` (also `web`, `caddy`, `db`, `mailpit`) |
| Rebuild one service after a code change | `docker compose -f deploy/compose.yml up -d --build api` (or `web`) |
| Apply a changed `deploy/.env` | `docker compose -f deploy/compose.yml up -d` (recreates what changed; `restart` does not re-read the file) |
| Stop, keep data | `docker compose -f deploy/compose.yml stop` |
| Start again | `docker compose -f deploy/compose.yml up -d` |
| Remove containers, keep data | `docker compose -f deploy/compose.yml down` |
| Remove containers and ALL data (database, uploads) | `docker compose -f deploy/compose.yml down -v` |

The first build takes a few minutes (Maven and npm downloads are cached for later builds). The API needs under a minute to become healthy (Flyway migrations, then the seed on the first start); `web` and `caddy` start after it. Check with `bash scripts/smoke.sh`, which waits for the stack.

From Git Bash, container paths such as `/etc/caddy/Caddyfile` get rewritten to Windows paths: prefix the command with `MSYS_NO_PATHCONV=1`. After editing `deploy/caddy/Caddyfile`: `MSYS_NO_PATHCONV=1 docker compose -f deploy/compose.yml exec caddy caddy reload --config /etc/caddy/Caddyfile`.

## 3. URLs

| What | URL |
|---|---|
| Storefront | http://localhost:8000 |
| Admin | http://localhost:8000/admin |
| Mail inbox (Mailpit; every email the API sends lands here) | http://localhost:8025 |
| Database (debugging) | `127.0.0.1:55432`, database/user from `.env` |
| Health (inside the container only, Caddy answers 404) | `docker compose -f deploy/compose.yml exec api curl -s http://127.0.0.1:8080/actuator/health` |

Only Caddy (8000), Mailpit (8025) and the database (55432) are published, the last two on this machine only. To open the site from a phone on the same network use `http://<PC address>:8000`, allow Docker in the Windows firewall and set `DNA_SITE_URL` to that address so email links work. `HTTP_BIND=127.0.0.1` (the default) keeps the site off the network; set `HTTP_BIND=0.0.0.0` for a phone test or a server.

## 4. Configuration (`deploy/.env`)

| Variable | Meaning | Dev value |
|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Database name and login. The password is only read when the volume is created; to change it later run `ALTER USER` or `down -v` | `dna`, `dna`, `dna-dev-pass` |
| `DNA_BOOTSTRAP_MANAGER_USERNAME`, `DNA_BOOTSTRAP_MANAGER_PASSWORD` | First MANAGER account, created only while the `app_user` table is empty; password at least 8 characters | `owner`, `Dna-Dev-2026-Owner!` |
| `DNA_SITE_URL` | Base URL used in email links (API) and in canonical URLs, sitemap and robots (web) | `http://localhost:8000` |
| `DNA_MAIL_FROM` | From address of outgoing email | `no-reply@dnahoangnguyen.vn` |
| `DNA_ORDER_RATE_LIMIT`, `DNA_QUOTE_RATE_LIMIT`, `DNA_LOOKUP_RATE_LIMIT` | Order creates, quote creates and order lookups allowed per client IP and 10 minutes. API defaults are 5, 5 and 10; the dev `.env` raises them because every local visitor shares one address | `50`, `50`, `100` |
| `HTTP_BIND` | Interface for port 8000 (`0.0.0.0` = LAN, `127.0.0.1` = this machine) | `127.0.0.1` |
| `DNA_API_PROFILES` (optional, commented out) | Spring profiles of the API. Default `docker,mail`: notifications are emailed through Mailpit. `docker` alone only logs them | `docker,mail` |
| `DNA_SEED_CATALOGUE_ENABLED` | Load the 32 products / 69 SKUs at API start | `true` |
| `DNA_SEED_CATALOGUE_PUBLISH` | Publish the seeded products so the storefront shows data | `true` |
| `DNA_SEPAY_ENABLED` | `false` turns the bank webhook off (404) | `true` |
| `DNA_SEPAY_WEBHOOK_KEYS` | Comma-separated API keys accepted by the webhook | `dev-sepay-key-change-me` |
| `DNA_SEPAY_ACCOUNT_NO` | Account number SePay reports; must equal the bank account for auto-matching | `0123456789` |
| `DNA_BANK_NAME`, `DNA_BANK_BIN`, `DNA_BANK_ACCOUNT_NO`, `DNA_BANK_ACCOUNT_NAME` | Bank transfer details shown to customers and put in the VietQR | demo placeholders |

Fixed by `compose.yml`: mail host `mailpit:1025`, Turnstile off, uploads directory `/app/uploads` (reserved for image upload, not read by the API yet), JVM options `-Xms256m -Xmx512m -XX:MaxMetaspaceSize=160m -XX:+ExitOnOutOfMemoryError`.

## 5. Dev credentials: change them

`deploy/.env.example` ships placeholders for the database password, the SePay key, the bank account and the first admin (`owner` / `Dna-Dev-2026-Owner!`). They are for this machine only:

- Before anyone else can reach the stack (LAN demo, server), change them. For the admin password use the SQL reset in section 8 (the API also offers `POST /api/admin/me/password` for a signed-in user).
- Replace the demo bank values in `/admin/settings` (or in `.env`) before showing a real payment screen.
- Never commit `deploy/.env`.

## 6. Catalogue seed

The API loads the catalogue from `apps/api/src/main/resources/seed/catalogue-2026.csv` while `DNA_SEED_CATALOGUE_ENABLED=true`. It runs inside the API at start, creates only what is missing (SKU codes that already exist are skipped) and then stores `seed.catalogue.appliedAt` in the settings table, so the first start loads everything and every later start skips the seed (a renamed base code is never recreated). Set the flag to `false` once the data is in anyway. `DNA_SEED_CATALOGUE_PUBLISH=true` publishes the seeded products; with `false` they stay drafts until published in `/admin`. To start from an empty database run `down -v` and `up -d --build`.

## 7. Backup and restore

Backup writes two files into `data/backups/` (gitignored): `dna-YYYYmmdd-HHMM.dump` (custom-format `pg_dump`) and `uploads-YYYYmmdd-HHMM.tar.gz` (every product and category picture in the `uploads` volume). Files older than `KEEP_DAYS` (default 14) are deleted. With `BACKUP_REMOTE` set to an [rclone](https://rclone.org) destination, both files are also copied off the server and remote copies older than `KEEP_DAYS` are deleted; the run fails if that copy fails.

```bash
bash scripts/backup.sh
KEEP_DAYS=30 BACKUP_REMOTE=r2:tinphat-backups bash scripts/backup.sh   # with an off-site copy
```

On the VPS, run it every night from cron (`crontab -e`; adjust the path and the remote):

```cron
0 2 * * * cd /opt/tinphat && BACKUP_REMOTE=r2:tinphat-backups bash scripts/backup.sh >> /var/log/tinphat-backup.log 2>&1
```

A backup that only lives on the VPS is lost with the VPS: set `BACKUP_REMOTE` (Cloudflare R2, Google Drive, another server; configure it once with `rclone config`). Never run `docker compose down -v` on the server: `-v` deletes the database and the pictures.

Restore (replaces everything in the database with the dump: rows created after the dump are lost, export them first if they matter; use the name of your dump file):

```bash
docker compose -f deploy/compose.yml stop caddy web api
docker compose -f deploy/compose.yml exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < data/backups/dna-20261031-1414.dump
docker compose -f deploy/compose.yml up -d
```

Restore the pictures (adds the files from the archive back into the `uploads` volume; files with the same name are replaced):

```bash
docker compose -f deploy/compose.yml exec -T api sh -c 'tar -C /app/uploads -xzf -' < data/backups/uploads-20261031-1414.tar.gz
```

Verify with `bash scripts/smoke.sh`.

## 8. Account runbook (SQL)

There is no users screen: accounts are managed in the database. Roles: `MANAGER` (everything) and `EDITOR` (no price changes, no payment confirmation, no settings). Sessions end by themselves on the next request when a user is disabled, gets a new role or a new password.

Define two helpers once per bash session. `sql` runs SQL read from stdin, `bcrypt_hash` prints a bcrypt hash of its argument (the first call pulls the small `httpd:2.4-alpine` image; avoid single quotes in passwords):

```bash
sql() { docker compose -f deploy/compose.yml exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'; }
bcrypt_hash() { docker run --rm httpd:2.4-alpine htpasswd -nbBC 12 x "$1" | tr -d '\r\n' | cut -d: -f2; }
```

Stored hashes carry the `{bcrypt}` prefix. The plain password is visible in the command line and the shell history, so hand out a temporary password and have the user change it after the first login.

List users:

```bash
sql <<SQL
select id, username, display_name, role, enabled, password_changed_at from app_user order by id;
SQL
```

Create a user:

```bash
sql <<SQL
insert into app_user (username, password_hash, display_name, role)
values ('editor1', '{bcrypt}$(bcrypt_hash 'Mat-khau-moi-2026')', 'Nhân viên 1', 'EDITOR');
SQL
```

Reset a password (the user's open sessions end on their next request):

```bash
sql <<SQL
update app_user
   set password_hash = '{bcrypt}$(bcrypt_hash 'Mat-khau-khac-2026')', password_changed_at = now(), updated_at = now()
 where username = 'editor1';
SQL
```

Disable, re-enable, change role:

```bash
sql <<SQL
update app_user set enabled = false, updated_at = now() where username = 'editor1';
update app_user set enabled = true,  updated_at = now() where username = 'editor1';
update app_user set role = 'MANAGER', updated_at = now() where username = 'editor1';
SQL
```

Locked out by the login delay (after 5 wrong passwords each further attempt must wait, up to 15 minutes; the delay lives in memory): `docker compose -f deploy/compose.yml restart api` clears all delays.

Lost the only MANAGER password: run the reset above for that username, then log in and change it in the admin.

## 9. SePay webhook

- URL: `https://<domain>/api/webhooks/bank/sepay` (SePay must reach it from the internet; on this local stack use a tunnel for a real test).
- Header: `Authorization: Apikey <key>`, where `<key>` is one of the values of `DNA_SEPAY_WEBHOOK_KEYS`. In the SePay webhook form choose API Key authentication, JSON content type and the incoming-money event.
- `DNA_SEPAY_ACCOUNT_NO` must equal the bank account number, otherwise payments land in the REVIEW queue instead of marking the order paid.
- Check from this machine (a missing or wrong key must answer 401):

```bash
curl -i -X POST http://localhost:8000/api/webhooks/bank/sepay -H 'Content-Type: application/json' -d '{}'
```

- Rotate the key: list the new key after the old one (`old,new`), `docker compose -f deploy/compose.yml up -d`, change the key in SePay and send a test, then remove the old key and run `up -d` again.
- Turn the webhook off: `DNA_SEPAY_ENABLED=false` and `up -d`; the endpoint answers 404 and orders are marked paid by hand ("Đã nhận tiền").

## 10. Smoke test

```bash
bash scripts/smoke.sh
```

Waits for the stack, prints one PASS/FAIL line per check and exits non-zero on any failure. Checks: storefront, `robots.txt`, `sitemap.xml`, public settings and nav, `/actuator` not exposed, webhook rejects a missing key, anonymous `/api/admin/me` is a 401 problem response, CSRF cookie, login as the bootstrap manager, and that the hidden SV465 prices (Thùng, Dây 8) do not appear in the product API or page. Options (base URL, other credentials, product slug) are listed at the top of the script.

## 11. Known limits and what is cut

This stack is a demo/dev environment, not a production deployment:

- Plain HTTP on one machine, no Cloudflare or Authenticated Origin Pulls, no CSP header, no edge rate limits, no container memory limits, no log rotation settings.
- Mail never leaves the machine (Mailpit); no real SMTP configuration.
- Docker Desktop hides real client addresses: Caddy sees every visitor as the same internal address, so per-IP limits (login, order and quote forms, order lookup) count all local visitors together. The order, quote and lookup limits are raised in `.env` for that reason; the login limit is not.
- Backups are local files made by hand; no off-site copy, no scheduled run, no restore drill, no uptime or backup monitor, no automatic revert on a failed release.
- Dev credentials and a database port on the host (loopback only).
- Cut from the MVP: KiotViet import and fields, image upload and processing (products show a placeholder; the `uploads` volume is prepared for later), slug history and redirects, attribute filters, bulk edit, product and brand merge, news and page management, home blocks, discount-tier admin screen, Turnstile widget (flag stays off), Excel and print exports, `/bang-gia`, contact form, amount reissue and line edits after submit, bank reconcile job, users screen, CI workflow, Playwright and Lighthouse runs.

### Before this stack faces the internet

Everything above is tuned for one machine. The independent review of the MVP listed what changes the moment the stack is reachable from outside; do these first:

1. **Production profile.** Set `DNA_API_PROFILES=prod,mail` in `deploy/.env`. The `docker` profile changes nothing; `prod` turns on the `Secure` session cookie (needs HTTPS at the edge), structured logs and turns Flyway `out-of-order` off. With `DNA_SEPAY_ENABLED=true` the `prod` profile also refuses webhook keys shorter than 32 characters or containing a placeholder word (`change-me`, `dev-`, `example`, `test`, `secret`).
2. **Client IP behind Cloudflare.** `deploy/caddy/Caddyfile` sets `CF-Connecting-IP` to the TCP peer (`{remote_host}`), which is right for direct access and for this machine. Behind Cloudflare every visitor then looks like one of a few edge addresses, so the per-IP limits (20 logins and 5 orders per 10 minutes) become site-wide and anyone could lock the owner out of `/admin`. In the server Caddyfile trust Cloudflare (`servers { trusted_proxies static <Cloudflare ranges> }`), use `header_up CF-Connecting-IP {client_ip}`, and accept connections only from Cloudflare (Authenticated Origin Pulls) so the header cannot be spoofed.
3. **Webhook key and account.** Generate the key with `openssl rand -hex 32`, never reuse the `.env.example` value, and set `DNA_SEPAY_ACCOUNT_NO` and the bank settings to the real account. Anyone who knows the key, an order code and its total can mark that order paid.
4. **Passwords.** bcrypt reads at most 72 bytes: longer admin passwords are refused (accented letters count as two or three bytes).
5. **Seed.** Set `DNA_SEED_CATALOGUE_ENABLED=false` after the first start, and keep `DNA_SEED_CATALOGUE_PUBLISH` off unless the seeded products should go live untouched.
6. **Ports and credentials.** Keep `HTTP_BIND=127.0.0.1` unless a reverse proxy on another machine needs the port; change every dev credential (section 5); take an off-site backup and run one restore before real orders arrive.

Behaviours the review accepted for the MVP and left as they are: a replayed `submissionId` returns the stored order even if the basket changed in between; rate limits count successful creates only; `cart/price` and search suggestions have no per-IP limit; each listing or search call reads the whole catalogue (fine for about 32 products).

## 12. Troubleshooting

| Symptom | Check |
|---|---|
| `port is already allocated` | Another program uses 8000, 8025 or 55432: `netstat -ano \| findstr :8000`, stop it |
| Site answers 502 | `docker compose -f deploy/compose.yml ps`: api or web not healthy yet, then `logs api` / `logs web` |
| API restarts, log shows `password authentication failed` | `POSTGRES_PASSWORD` was changed after the volume was created: `down -v` (wipes data) or `ALTER USER` |
| Flyway warns `outOfOrder mode is active` | Expected: migrations from different modules may arrive in any order here; production sets it to false |
| API fails with `Migration checksum mismatch` | A migration file was edited after this database applied it. The dev database is disposable: `down -v`, then `up -d --build` |
| `Not found: C:/Program Files/Git/...` | Git Bash path rewriting, prefix with `MSYS_NO_PATHCONV=1` |

## 13. Production on a VPS (Cloudflare + HTTPS)

Files: `deploy/compose.prod.yml` (overrides), `deploy/caddy/Caddyfile.prod` (domain, origin certificate, Cloudflare client IP), `deploy/caddy/routes.caddy` (routes shared with the local Caddyfile), `deploy/production.env.example`, `scripts/prod.sh` (runs Compose with both files and refuses `-v`). Tested locally under a separate project: HTTPS 200, HTTP and `www` redirect to `https://<domain>`, `/actuator` 404, HSTS, `DNA_SESSION` cookie `Secure; HttpOnly`, idle memory about 470 MB (api), 70 MB (web, db), 15 MB (caddy).

1. **Server** (Ubuntu 24.04): a sudo user with SSH key login, password and root login off, `ufw` allowing OpenSSH, 80 and 443, 2 GB swap, timezone `Asia/Ho_Chi_Minh`, Docker Engine with the compose plugin and `/etc/docker/daemon.json` log limits (`max-size 10m`, `max-file 3`). If outbound NTP (UDP 123) is blocked, `htpdate` keeps the clock over HTTPS.
2. **Code**: `git clone <repo> /opt/tinphat` (a private repository needs a read-only deploy key).
3. **Cloudflare**: add the domain, set the registrar's nameservers to Cloudflare's, add `A` records for `@` and `www` to the server IP with the proxy on, SSL/TLS mode **Full (strict)**. SSL/TLS > Origin Server > Create certificate (RSA, the domain and `*.domain`, 15 years); save the certificate as `deploy/caddy/certs/origin.pem` and the key as `deploy/caddy/certs/origin.key` on the server (`chmod 600` the key; the folder is gitignored).
4. **Settings**: `cp deploy/production.env.example deploy/.env` and fill it (database password from `openssl rand -hex 24`, Gmail app password, `SITE_DOMAIN`, `DNA_SITE_URL`).
5. **Data** (optional, to keep what was built locally): on the local machine `bash scripts/backup.sh`, copy the two newest files from `data/backups/` to the server, then on the server:
   ```bash
   bash scripts/prod.sh up -d db
   bash scripts/prod.sh exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner' < dna-YYYYmmdd-HHMM.dump
   bash scripts/prod.sh up -d api
   bash scripts/prod.sh exec -T api sh -c 'tar -C /app/uploads -xzf -' < uploads-YYYYmmdd-HHMM.tar.gz
   ```
6. **Start**: `bash scripts/prod.sh up -d --build`, then `SMOKE_BASE_URL=https://<domain> bash scripts/smoke.sh`, log in to `/admin`, change the password, and try "Quên mật khẩu" to check the mail.
7. **Backups**: nightly cron as in section 7 with `BACKUP_REMOTE` set, and one test restore.
8. **Updates**: `cd /opt/tinphat && git pull && bash scripts/prod.sh up -d --build`.

`trusted_proxies` in `Caddyfile.prod` lists the Cloudflare ranges from https://www.cloudflare.com/ips/; update it if Cloudflare adds ranges. Docker publishes 80/443 past `ufw`, so the origin also answers requests sent straight to its IP (with the origin certificate, which browsers do not trust); restricting 80/443 to Cloudflare needs rules in the `DOCKER-USER` chain or Authenticated Origin Pulls.
