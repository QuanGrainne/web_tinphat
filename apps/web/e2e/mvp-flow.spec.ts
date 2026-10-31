import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

// Walks the demo like a customer and like the owner. Screenshots land in docs/mvp-screens/.
// Run: npx playwright test   (env: BASE_URL, ADMIN_USER, ADMIN_PASS)

const ADMIN_USER = process.env.ADMIN_USER ?? "owner";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "Dna-Dev-2026-Owner!";
const SHOTS = path.resolve(__dirname, "../../../docs/mvp-screens");

async function shot(page: Page, name: string, fullPage = true) {
  await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
}

async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

test.describe.configure({ mode: "serial" });

let orderCode = "";
let quoteCode = "";

test("storefront: home, search, product page unit picker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Nhóm hàng").first()).toBeVisible();
  await expect(page.locator("a[href^='/danh-muc/']").first()).toBeVisible();
  await shot(page, "01-home-desktop");

  await page.goto("/tim-kiem?q=SV6C");
  const card = page.locator("a[href^='/san-pham/']").first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/san-pham\//);

  // base unit first; pick the Cây (Dây) tile: 12 gói at 364.750đ saves 1,9%
  await page.getByRole("radio", { name: /Cây/ }).click();
  await expect(page.locator(".price")).toContainText("364.750đ");
  await expect(page.getByText("Tiết kiệm 1,9%")).toBeVisible();
  await shot(page, "02-product-desktop");
});

test("storefront: hidden-price SKUs show Liên hệ and cannot be ordered", async ({ page }) => {
  await page.goto("/tim-kiem?q=SV465");
  await page.locator("a[href^='/san-pham/']").first().click();
  await page.getByRole("radio", { name: /Thùng/ }).click();
  await expect(page.locator(".price")).toContainText("Liên hệ");
  await expect(page.getByRole("button", { name: "Thêm vào giỏ" })).toBeDisabled();
  const html = await page.content();
  for (const leak of ["426.400", "426400", "42.640", "42640"]) expect(html).not.toContain(leak);
  await shot(page, "03-product-liên-hệ");
});

test("storefront: quote basket and quote submit", async ({ page }) => {
  await page.goto("/tim-kiem?q=SV320");
  await page.locator("a[href^='/san-pham/']").first().click();
  await page.getByRole("button", { name: "Thêm báo giá" }).click();
  await page.goto("/bao-gia");
  await expect(page.getByText(/SV320/).first()).toBeVisible();
  await page.getByLabel(/Người liên hệ/).fill("Nguyễn Văn Kiểm Thử");
  await page.getByLabel(/Số điện thoại/).fill("0912345678");
  await shot(page, "04-quote-basket");
  await page.locator("button[type=submit]:visible", { hasText: /Gửi yêu cầu/ }).click();
  const code = page.getByText(/BG[0-9A-HJKMNP-TV-Z]{6}/).first();
  await expect(code).toBeVisible({ timeout: 20_000 });
  quoteCode = (await code.innerText()).match(/BG[0-9A-HJKMNP-TV-Z]{6}/)![0];
  await shot(page, "05-quote-submitted");
});

test("storefront: order by bank transfer shows text first, no QR", async ({ page }) => {
  await page.goto("/tim-kiem?q=SV6C");
  await page.locator("a[href^='/san-pham/']").first().click();
  await page.getByRole("button", { name: "Tăng" }).click(); // qty 2
  await page.getByRole("button", { name: "Thêm vào giỏ" }).click();
  await page.goto("/gio-hang");
  await expect(page.getByText("Nhân viên xác nhận tồn kho, phí giao và tổng tiền")).toBeVisible();
  await page.getByLabel(/Họ tên/).fill("Trần Thị Thử");
  await page.getByLabel(/Số điện thoại/).fill("0912345678");
  await page.getByLabel(/Địa chỉ nhận hàng/).fill("Số 1, phường Hòa Bình, tỉnh Phú Thọ");
  await page.getByRole("radio", { name: "Chuyển khoản" }).check();
  await shot(page, "06-checkout");
  await page.locator("button[type=submit]:visible", { hasText: "Đặt hàng" }).click();
  await expect(page).toHaveURL(/\/don-hang\/DNA[0-9A-HJKMNP-TV-Z]{6}/, { timeout: 20_000 });
  orderCode = page.url().match(/DNA[0-9A-HJKMNP-TV-Z]{6}/)![0];

  await expect(page.getByText("Chờ xác nhận").first()).toBeVisible();
  await expect(page.getByText("0123456789").first()).toBeVisible(); // account number as text
  await expect(page.getByRole("img", { name: "Mã QR chuyển khoản" })).toHaveCount(0);
  await shot(page, "07-order-pending-no-qr");
});

test("admin: login, products, flagged SKUs", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Tên đăng nhập").fill(ADMIN_USER);
  await page.getByLabel("Mật khẩu").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/admin\/products/, { timeout: 20_000 });
  await expect(page.getByText("Cần xác nhận quy cách").first()).toBeVisible({ timeout: 20_000 });
  await shot(page, "08-admin-products", false);
});

test("admin: confirm order with shipping fee, customer then sees the QR", async ({ page, browser }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập").fill(ADMIN_USER);
  await page.getByLabel("Mật khẩu").fill(ADMIN_PASS);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.goto("/admin/requests");
  const row = page.getByRole("row", { name: new RegExp(orderCode) });
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
  await expect(page.getByText("Khách cần trả").first()).toBeVisible();
  await shot(page, "09-admin-order-detail", false);

  await page.getByRole("button", { name: "Xác nhận đơn" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Phí giao hàng").fill("30000");
  await dialog.getByRole("button", { name: "Xác nhận đơn" }).click();
  await expect(dialog).toBeHidden({ timeout: 20_000 });

  // customer side, fresh browser context (no stored phone): look the order up by code + phone
  const customer = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const cp = await customer.newPage();
  await cp.goto(`/don-hang/${orderCode}`);
  await cp.getByLabel(/Số điện thoại/).fill("0912345678");
  await cp.locator("button[type=submit]:visible").first().click();
  await expect(cp.getByRole("img", { name: "Mã QR chuyển khoản" })).toBeVisible({ timeout: 20_000 });
  expect(await noHorizontalScroll(cp)).toBe(true);
  await cp.screenshot({ path: path.join(SHOTS, "10-order-confirmed-qr-mobile.png"), fullPage: true });
  await customer.close();
});

test("mobile 390px: no horizontal scroll on main storefront pages", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  for (const url of ["/", "/tim-kiem?q=SV6C", "/bao-gia", "/gio-hang", "/tra-cuu-don", "/gioi-thieu"]) {
    await page.goto(url);
    expect(await noHorizontalScroll(page), `${url} scrolls horizontally`).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({ path: path.join(SHOTS, "11-home-mobile.png"), fullPage: true });
  await ctx.close();
  expect(quoteCode).toMatch(/^BG/);
});
