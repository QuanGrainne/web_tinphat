# Tín Phát Decord catalogue

The site is a product catalogue for Tín Phát Decord. The home page has a banner, category tiles, one product row per category beside a category list, then the company sections. Cards show the price, or "Liên hệ" when none is set, and a "Liên hệ ngay" button that opens Zalo. There is no cart or checkout on the storefront. This replaces the sales flow described in `mvp-status.md`; the run and operate steps in `deployment-guide.md` still apply.

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

The first product image is the cover shown on cards; the others appear on the product page (`product_image` table). Storefront pages read the API on every request, so admin edits show on the next page load. Images are JPG, PNG or WebP up to 5 MB. `POST /api/admin/uploads/images` checks the file's own bytes, stores it under a generated name in the `uploads` volume and Caddy serves it from `/uploads/`. Back up that volume together with the database: `scripts/backup.sh` covers only the database.

Fixed brand copy (hero, about, capability, process) is in `apps/web/lib/tinphat/content.ts`. Company name, address, hotline and Zalo are in the `app_setting` table (migration `V50__tinphat_catalogue.sql`).

## Excel import and export

`/admin/products` has "Import Excel" and "Xuất Excel". The import reads a KiotViet product export or a file exported here, by column name:

- One row is one web product. The name takes the variant from "Thuộc tính", so `Tag treo tết` with `LOẠI:dê đội mũ` becomes `Tag treo tết - dê đội mũ`.
- The dialog imports into a chosen category, or uses "Nhóm hàng" from the file and creates it (two levels at most).
- A code that already exists updates that product. A price of 0 means no price and never clears a price set on the web. Empty images and descriptions also keep what is stored.
- Rows with "Mã ĐVT Cơ bản" (secondary units) are skipped.
- Images stay as links to the KiotViet CDN and are not copied here. If KiotViet removes a photo it disappears from the site.

The export writes the same column names for the whole catalogue, or for the category selected in the list filter.

## Ticking products

Ticking rows in `/admin/products` offers "Xuất đã chọn" and "Xóa". Delete is permanent, needs a manager and a confirmation, and also removes the product's SKUs, price history and photo links. A product on an order or a quote cannot be deleted, only discontinued. Uploaded image files stay in the `uploads` volume.

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
