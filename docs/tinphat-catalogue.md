# Tín Phát Decor catalogue

The site is a product catalogue for Tín Phát Decor. The home page has a banner, category tiles, one product row per category beside a category list, then the company sections. Cards show the price, or "Liên hệ" when none is set, and a "Liên hệ ngay" button that opens Zalo. There is no cart or checkout on the storefront. This replaces the sales flow described in `mvp-status.md`; the run and operate steps in `deployment-guide.md` still apply.

## Run it

```
copy deploy\.env.example deploy\.env
docker compose -f deploy/compose.yml up -d --build --wait
node scripts/seed-tinphat.mjs        # 6 categories and 11 products from landingpage_TinPhatDecord
bash scripts/smoke.sh
```

If Windows refuses port 55432 (`netsh interface ipv4 show excludedportrange protocol=tcp`), set `DB_PORT=15432` in `deploy/.env`.

## Manage content

| Task | Where |
|---|---|
| Add or edit a category, its image and short description | `/admin/categories` |
| Add or edit a product, its price and up to 5 images | `/admin/products` |
| Change category order | "Thứ tự" in the category dialog |
| Hide a category or product | "Hiển thị trên web" |

The first product image is the cover shown on cards; the others appear on the product page (`product_image` table). Storefront pages read the API on every request, so admin edits show on the next page load. Images are JPG, PNG or WebP up to 5 MB. `POST /api/admin/uploads/images` checks the file's own bytes, stores it under a generated name in the `uploads` volume and Caddy serves it from `/uploads/`. `scripts/backup.sh` backs up that volume together with the database (see the deployment guide, section 7).

Fixed brand copy (hero, about, capability, process) is in `apps/web/lib/tinphat/content.ts`. Company name, address, hotline and Zalo are in the `app_setting` table (migration `V50__tinphat_catalogue.sql`).

## Excel import and export

`/admin/products` has "Import Excel" and "Xuất Excel". The import reads a KiotViet product export or a file exported here, by column name:

- One row is one web product. The name takes the variant from "Thuộc tính", so `Tag treo tết` with `LOẠI:dê đội mũ` becomes `Tag treo tết - dê đội mũ`.
- The dialog imports into a chosen category, or uses "Nhóm hàng" from the file and creates it (two levels at most).
- A code that already exists updates that product. A price of 0 means no price and never clears a price set on the web. Empty images and descriptions also keep what is stored.
- Rows with "Mã ĐVT Cơ bản" (secondary units) are skipped.
- Images are copied from the KiotViet CDN into the `uploads` volume during the import, so a photo deleted in KiotViet stays on the site. Only HTTPS addresses on `kiotviet.vn` and its subdomains are fetched (`DNA_IMAGE_IMPORT_ALLOWED_HOSTS`, comma separated, changes the list); redirects are not followed and a file must be a JPG, PNG or WebP of at most 5 MB. The table `imported_image` remembers each source address, so importing the same file again reuses the copy. A picture that cannot be fetched keeps its link and is counted in the import result; `/admin/products` then shows how many links remain and a manager's "Tải về máy chủ" button copies them (`GET /api/admin/images/remote`, `POST /api/admin/images/localize`).

The export writes the same column names for the whole catalogue, or for the category selected in the list filter.

## Ticking products

The product popup also has a "Xóa" button (managers only) for the product being edited. The category filter in the list starts at "Tất cả".

Ticking rows in `/admin/products` offers "Xuất đã chọn" and "Xóa". Delete is permanent, needs a manager and a confirmation, and also removes the product's SKUs, price history and photo links. A product on an order or a quote cannot be deleted, only discontinued. Uploaded image files stay in the `uploads` volume.

## Photos on the storefront

Product, category and banner photos go through `next/image` (`apps/web/components/catalog-image.tsx`): each slot gets a WebP copy at its own width, for example about 30 to 50 KB for a card instead of a 1.5 to 3.5 MB original. Uploads (`/uploads/...`, read from Caddy through a rewrite in `next.config.ts`) and KiotViet photos are optimised; links to any other host are shown unchanged. Copies are kept in the `web_image_cache` volume, so only the very first view of a photo waits for it to be made.

## Deleting categories

"Xóa" on a category row deletes it for good (managers only, with a confirmation). A category that still has products or sub-categories is refused and the message says which; move or delete those first.

## Discontinued products and passwords

A discontinued product can still be shown on the site ("Hiển thị trên web" stays available). It is then listed after all other products with a "Ngừng kinh doanh" label, no price and no contact button, and its page says it is no longer sold. It is left out of the sitemap. Untick "Hiển thị trên web" to remove it from the site.

Admins change their own password from the account menu (top right, "Đổi mật khẩu"): current password, then the new one twice, 8 characters or more. The current session stays signed in; other sessions of the account end.

## Forgotten password

"Quên mật khẩu?" on the login page asks for the account's recovery email and mails a link to `/admin/reset-password`. The link works once, expires after 30 minutes, and setting the new password signs the account out everywhere. The page answers the same whether or not the address belongs to an account. Requests are limited to 5 per client IP and 3 per account every 15 minutes.

Each admin sets the recovery email in the account menu ("Email lấy lại mật khẩu", current password required). A fresh install can set it for the first account with `DNA_BOOTSTRAP_MANAGER_EMAIL`.

Mail goes to Mailpit locally. For a server, fill the `SMTP_*` block of `deploy/.env` (Gmail: `smtp.gmail.com`, port 587, auth and STARTTLS on, an App password from a Google account with 2-Step Verification) and set `DNA_MAIL_FROM` to the same Gmail address and `DNA_SITE_URL` to the public address, since the link is built from it. Then `docker compose -f deploy/compose.yml up -d`.

## What is switched off

The sales code stays in the repository but is not reachable by customers:

- `next.config.ts` redirects `/gio-hang`, `/bao-gia`, `/tra-cuu-don`, `/don-hang/*`, `/chinh-sach` and `/thuong-hieu/*`.
- `deploy/caddy/Caddyfile` answers 404 for `/api/public/orders*` and `/api/public/quotes*`.
- The admin menu shows only Sản phẩm and Danh mục.

Because of this, `scripts/seed-demo.mjs`, `scripts/api-flow-check.mjs` and `apps/web/e2e/mvp-flow.spec.ts` no longer apply. Use `apps/web/e2e/tinphat-catalogue.spec.ts`, which leaves a test category and product behind.

A product needs a category and one visible SKU to be published; a price is optional, and is set in the "Giá" field of the product form. The admin form creates that SKU for you and shows it as "Mã sản phẩm".

## Tests on Windows

The JVM may report the time zone as `Asia/Saigon`, which PostgreSQL 18 refuses, and every integration test then fails to start:

```
mvn -f apps/api/pom.xml test -DargLine=-Duser.timezone=Asia/Ho_Chi_Minh
```
