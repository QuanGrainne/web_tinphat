// Walks the catalogue against a running stack. The first test leaves a test category and product behind.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const SHOTS = process.env.SHOTS_DIR ?? path.join(process.cwd(), "test-results", "tinphat");
const IMAGE = path.join(process.cwd(), "public", "images", "tinphat", "dong-hang.jpg");
const IMAGE_2 = path.join(process.cwd(), "public", "images", "tinphat", "kho-hang.jpg");
const USER = process.env.ADMIN_USER ?? "owner";
const PASS = process.env.ADMIN_PASS ?? "Dna-Dev-2026-Owner!";

mkdirSync(SHOTS, { recursive: true });

test("admin creates a category and a product with images, the visitor finds them", async ({ page }) => {
  const stamp = Date.now().toString(36);
  const category = `Đám cưới ${stamp}`;
  const product = `Hoa cưới ${stamp}`;

  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập").fill(USER);
  await page.getByLabel("Mật khẩu").fill(PASS);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/admin/products");

  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "Tạo mới" }).click();
  const categoryDialog = page.getByRole("dialog");
  await categoryDialog.getByLabel("Tên danh mục").fill(category);
  await categoryDialog.getByLabel("Mô tả ngắn").fill("Trang trí tiệc cưới và sự kiện.");
  await categoryDialog.locator('input[type="file"]').setInputFiles(IMAGE);
  await expect(categoryDialog.getByRole("img", { name: "Ảnh đã chọn" })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "admin-category-dialog.png") });
  await categoryDialog.getByRole("button", { name: "Lưu" }).click();
  await expect(page.getByRole("cell", { name: category, exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "admin-categories.png") });

  await page.goto("/admin/products");
  await page.getByRole("button", { name: "plus Tạo mới" }).click();
  const productDialog = page.getByRole("dialog");
  await productDialog.getByLabel("Tên sản phẩm").fill(product);
  await productDialog.locator(".ant-tree-select").click();
  await page.locator(".ant-select-tree-title", { hasText: category }).click();
  await productDialog.locator('input[type="file"]').setInputFiles([IMAGE, IMAGE_2]);
  await expect(productDialog.getByRole("img", { name: "Ảnh đã chọn" })).toHaveCount(2);
  await page.screenshot({ path: path.join(SHOTS, "admin-product-editor.png") });
  await productDialog.getByRole("button", { name: "Lưu" }).click();
  await expect(productDialog).toBeHidden();

  // The storefront caches navigation for up to a minute, so go straight to the new category.
  const slugs = await (await page.request.get("/api/admin/categories")).json();
  const created = slugs.find((c: { name: string }) => c.name === category);
  await page.goto(`/danh-muc/${created.slug}`);
  await expect(page.getByRole("heading", { level: 1, name: category })).toBeVisible();
  await expect(page.getByText("Trang trí tiệc cưới và sự kiện.")).toBeVisible();
  await page.getByRole("link", { name: product }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: product })).toBeVisible();
  await expect(page.getByText("Liên hệ để nhận báo giá")).toBeVisible();
  const image = page.locator(".gal .main img");
  await expect(image).toHaveJSProperty("complete", true);
  const first = await image.getAttribute("src");
  await page.getByRole("button", { name: "Xem ảnh 2" }).click();
  await expect(image).not.toHaveAttribute("src", first ?? "");
  expect(await image.first().evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
});

test("the public pages look right on desktop and phone", async ({ page }) => {
  for (const [name, width, height] of [
    ["desktop", 1280, 900],
    ["mobile", 390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const [label, url] of [
      ["home", "/"],
      ["catalogue", "/san-pham"],
      ["category", "/danh-muc/sinh-nhat-party"],
      ["about", "/gioi-thieu"],
      ["contact", "/lien-he"],
    ] as const) {
      await page.goto(url);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) {
          window.scrollTo({ top: y, behavior: "instant" });
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        window.scrollTo({ top: 0, behavior: "instant" });
      });
      // images that are not displayed (a closed menu, a photo hidden on phones) load lazily, so they are not waited for
      await page.waitForFunction(() => [...document.images].every((img) => !img.checkVisibility() || (img.complete && img.naturalWidth > 0)), undefined, { timeout: 30_000 });
      await page.screenshot({ path: path.join(SHOTS, `${label}-${name}.png`), fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${url} at ${width}px`).toBeLessThanOrEqual(0);
      await expect(page.locator("body")).not.toContainText("DNA");
      await expect(page.locator("body")).not.toContainText("Giỏ hàng");
    }
  }
});

test("on a wide screen the content uses the width instead of leaving empty sides", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/");
  const box = await page.locator(".tp-shop").boundingBox();
  expect(box!.width).toBeGreaterThan(1640);
  expect(box!.x).toBeLessThan(140);
  await page.screenshot({ path: path.join(SHOTS, "home-1920.png") });
});

test("every category on the home page is its own full-width block", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/");
  const blocks = page.locator(".tp-rowsec");
  const boxes = await blocks.evaluateAll((items) => items.map((item) => item.getBoundingClientRect()).map((box) => ({ x: box.x, y: box.y, width: box.width, height: box.height })));
  expect(boxes.length).toBeGreaterThan(1);
  for (const [index, box] of boxes.entries()) {
    expect(box.x).toBe(boxes[0].x);
    expect(box.width).toBe(boxes[0].width);
    if (index > 0) expect(box.y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height);
  }
});

test("choosing a category in the side list shows its products beside it", async ({ page }) => {
  await page.goto("/san-pham");
  const side = page.getByRole("complementary", { name: "Danh mục sản phẩm" });
  await expect(page.getByRole("heading", { level: 1, name: "Tất cả sản phẩm" })).toBeVisible();
  await side.getByRole("link", { name: /Sinh nhật/ }).click();
  await expect(page).toHaveURL(/\/danh-muc\/sinh-nhat-party$/);
  await expect(page.getByRole("heading", { level: 1, name: /Sinh nhật/ })).toBeVisible();
  await expect(side.getByRole("link", { name: /Sinh nhật/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Mũ sinh nhật", exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(SHOTS, "catalogue-sidebar.png") });
});

test("the admin product screens carry no SKU totals or SEO tab", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập").fill(USER);
  await page.getByLabel("Mật khẩu").fill(PASS);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/admin/products");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("quy cách hiện");
  await page.getByRole("button", { name: "plus Tạo mới" }).click();
  await expect(page.getByRole("tab", { name: "Mô tả" })).toBeVisible();
  await expect(page.getByLabel("Mã sản phẩm")).toHaveValue(/^SP\d{6}$/);
  await expect(page.getByRole("tab", { name: "SEO" })).toHaveCount(0);
  await page.screenshot({ path: path.join(SHOTS, "admin-products.png") });
});

test.describe("admin edits reach the public pages at once", () => {
  // Works on an existing product and puts it back, so it can run against a database with real content.
  const name = "Lồng đèn Trung Thu";

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Tên đăng nhập").fill(USER);
    await page.getByLabel("Mật khẩu").fill(PASS);
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await page.waitForURL("**/admin/products");
  });

  const openEditor = async (page: Page) => {
    await page.goto("/admin/products");
    await page.locator(".ant-table-row").getByText(name, { exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Tên sản phẩm")).toHaveValue(name);
    return dialog;
  };
  const save = async (dialog: Locator) => {
    await dialog.getByRole("button", { name: "Lưu" }).click();
    await expect(dialog).toBeHidden();
  };

  test("the Sửa button edits a category's description and image, and the public page follows", async ({ page }) => {
    const list = await (await page.request.get("/api/admin/categories")).json();
    const original = list.find((category: { name: string }) => category.name === "Noel");
    const description = `${original.description} (đã sửa)`;

    await page.goto("/admin/categories");
    await expect(page.locator(".ant-table-row-expand-icon:not(.ant-table-row-expand-icon-spaced)")).toHaveCount(0);
    await page.getByRole("button", { name: "Sửa Noel" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Mô tả ngắn").fill(description);
    await dialog.locator('input[type="file"]').setInputFiles(IMAGE);
    await expect(dialog.getByRole("img", { name: "Ảnh đã chọn" })).not.toHaveAttribute("src", original.imageUrl);
    await dialog.getByRole("button", { name: "Lưu" }).click();
    await expect(dialog).toBeHidden();

    await page.goto("/danh-muc/noel");
    await expect(page.getByText(description)).toBeVisible();
    await expect(page.locator(".tp-cat-hero img")).not.toHaveAttribute("src", original.imageUrl);

    await page.goto("/admin/categories");
    await page.evaluate(async (category) => {
      const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ name: category.name, description: category.description, imageUrl: category.imageUrl, visible: category.visible, sortOrder: category.sortOrder }),
      });
      if (!response.ok) throw new Error(`restore failed: ${response.status}`);
    }, original);
  });

  test("the Excel import previews a KiotViet file into a chosen category, and export downloads a file", async ({ page }) => {
    await page.goto("/admin/products");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: "download Xuất Excel" }).click();
    expect((await download).suggestedFilename()).toBe("san-pham-tin-phat.xlsx");

    await page.getByRole("button", { name: "Import Excel" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[type="file"]').setInputFiles(path.join(process.cwd(), "e2e", "fixtures", "kiotviet-sample.xlsx"));
    await expect(dialog.getByText("Tag treo tết - dê đội mũ")).toBeVisible();
    await expect(dialog.getByRole("button", { name: /Import \d+ sản phẩm/ })).toBeEnabled();
    await page.screenshot({ path: path.join(SHOTS, "admin-import.png") });
    await dialog.getByRole("button", { name: "Bỏ qua" }).click();
    await expect(dialog).toBeHidden();
  });

  test("ticked products export to a file and can be deleted, after a confirmation", async ({ page }) => {
    const name = `Xoá thử ${Date.now().toString(36)}`;
    await page.goto("/admin/products");
    // A throwaway product: the test removes what it made and touches nothing else.
    await page.evaluate(async (productName) => {
      const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ name: productName, skus: [{ code: productName, unitName: "cái", conversion: 1, isBase: true, price: null, visible: true }] }),
      });
      if (!response.ok) throw new Error(`create failed: ${response.status}`);
    }, name);

    await page.reload();
    await page.getByLabel("Tìm sản phẩm").fill(name);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await row.getByRole("checkbox").check();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByText("Đã chọn 1")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "admin-bulk.png") });

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Xuất đã chọn" }).click();
    expect((await download).suggestedFilename()).toBe("san-pham-tin-phat.xlsx");

    await page.getByRole("button", { name: "delete Xóa" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm).toContainText("không khôi phục được");
    await confirm.getByRole("button", { name: "Bỏ qua" }).click();
    await expect(row).toBeVisible();

    await page.getByRole("button", { name: "delete Xóa" }).click();
    await page.getByRole("dialog").getByRole("button", { name: /Xóa 1 sản phẩm/ }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByText("Đã chọn 1")).toHaveCount(0);
  });

  test("the list thumbnail previews on hover and opens the full-screen viewer, without opening the editor", async ({ page }) => {
    await page.goto("/admin/products");
    const thumb = page.getByRole("button", { name: `Xem ảnh ${name}` });
    await thumb.hover();
    await expect(page.locator(".ant-popover img")).toBeVisible();
    await page.screenshot({ path: path.join(SHOTS, "admin-hover.png") });
    await thumb.click();
    const viewer = page.getByRole("dialog", { name: "Xem ảnh" });
    await expect(viewer).toContainText(/1 \/ \d+/);
    await page.screenshot({ path: path.join(SHOTS, "admin-lightbox.png") });
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const dialog = await openEditor(page);
    await dialog.getByRole("button", { name: "Xem lớn ảnh 1" }).click();
    await expect(page.getByRole("dialog", { name: "Xem ảnh" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Xem ảnh" })).toHaveCount(0);
    await expect(dialog.getByLabel("Tên sản phẩm")).toHaveValue(name);
  });

  test("the product page photo opens the full-screen viewer", async ({ page }) => {
    await page.goto("/san-pham/long-den-trung-thu");
    await page.getByRole("button", { name: /Phóng to ảnh/ }).click();
    const viewer = page.getByRole("dialog", { name: "Xem ảnh" });
    await expect(viewer.getByRole("img", { name: "Ảnh 1" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
  });

  test("every picture is kept on this server, so no KiotViet link warning shows", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("table")).toBeVisible();
    const remote = await page.evaluate(async () => (await fetch("/api/admin/images/remote")).json());
    expect(remote).toEqual({ count: 0 });
    await expect(page.getByText(/đang lấy trực tiếp từ KiotViet/)).toHaveCount(0);
    // the storefront serves those pictures from /uploads, not from the KiotViet CDN
    await page.goto("/san-pham");
    const sources = await page.locator("img").evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).currentSrc || img.getAttribute("src") || ""));
    expect(sources.some((src) => src.includes("kiotviet"))).toBe(false);
  });

  test("the product popup has a delete button, and the category filter has Tất cả", async ({ page }) => {
    const name = `Xoá trong popup ${Date.now().toString(36)}`;
    await page.goto("/admin/products");
    await page.evaluate(async (productName) => {
      const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ name: productName, skus: [{ code: productName, unitName: "cái", conversion: 1, isBase: true, price: null, visible: true }] }),
      });
      if (!response.ok) throw new Error(`create failed: ${response.status}`);
    }, name);
    await page.reload();

    const total = page.locator(".ant-table-tbody > tr.ant-table-row");
    const filter = page.getByLabel("Danh mục", { exact: true });
    await filter.click();
    await expect(page.getByRole("treeitem", { name: "Tất cả" })).toBeVisible();
    await page.getByRole("treeitem", { name: /^Noel/ }).click();
    await expect(page.locator(".ant-tree-select").first()).toContainText("Noel");
    await filter.click();
    await page.getByRole("treeitem", { name: "Tất cả" }).click();
    await expect(page.locator(".ant-tree-select").first()).toContainText("Tất cả");
    await expect(total.first()).toBeVisible();

    await page.getByLabel("Tìm sản phẩm").fill(name);
    const row = page.getByRole("row", { name: new RegExp(name) });
    await row.getByText(name, { exact: true }).last().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Tên sản phẩm")).toHaveValue(name);
    await page.screenshot({ path: path.join(SHOTS, "admin-popup-delete.png") });
    await dialog.getByRole("button", { name: "Xóa sản phẩm này" }).click();
    await page.getByRole("dialog").last().getByRole("button", { name: "Bỏ qua" }).click();
    await expect(dialog.getByLabel("Tên sản phẩm")).toHaveValue(name);
    await dialog.getByRole("button", { name: "Xóa sản phẩm này" }).click();
    await page.getByRole("dialog").last().getByRole("button", { name: "Xóa sản phẩm", exact: true }).click();
    await expect(row).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("a discontinued product can stay on the site with a label, or be hidden", async ({ page }) => {
    const name = `Xoá ngừng bán ${Date.now().toString(36)}`;
    await page.goto("/admin/products");
    // A throwaway product in Trung Thu; the test deletes it at the end.
    const id = await page.evaluate(async (productName) => {
      const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
      const headers = { "Content-Type": "application/json", "X-XSRF-TOKEN": token };
      const categories = await (await fetch("/api/admin/categories")).json();
      const categoryId = categories.find((c: { slug: string }) => c.slug === "trung-thu").id;
      const created = await (
        await fetch("/api/admin/products", {
          method: "POST",
          headers,
          body: JSON.stringify({ name: productName, categoryId, skus: [{ code: productName, unitName: "cái", conversion: 1, isBase: true, price: 9000, visible: true }] }),
        })
      ).json();
      await fetch(`/api/admin/products/${created.id}/publish`, { method: "POST", headers });
      await fetch(`/api/admin/products/${created.id}/discontinue`, { method: "POST", headers });
      return created.id as number;
    }, name);

    try {
      await page.goto("/danh-muc/trung-thu");
      const card = page.locator(".card", { hasText: name });
      await expect(card).toContainText("Ngừng kinh doanh");
      await expect(card).not.toContainText("9.000");
      await expect(card.getByRole("link", { name: "Xem chi tiết" })).toBeVisible();
      await expect(page.locator(".tp-shop .grid").first().locator(".card").last()).toContainText(name);
      await page.screenshot({ path: path.join(SHOTS, "discontinued-card.png") });

      await page.goto("/admin/products");
      await page.getByLabel("Tìm sản phẩm").fill(name);
      await page.getByRole("row", { name: new RegExp(name) }).getByText(name, { exact: true }).last().click();
      const dialog = page.getByRole("dialog");
      const shown = dialog.getByRole("checkbox", { name: "Hiển thị trên web" });
      await expect(shown).toBeEnabled();
      await expect(shown).toBeChecked();
      await shown.uncheck();
      await dialog.getByRole("button", { name: "Lưu" }).click();
      await expect(dialog).toBeHidden();

      await page.goto("/danh-muc/trung-thu");
      await expect(page.locator(".card", { hasText: name })).toHaveCount(0);
    } finally {
      await page.goto("/admin/products");
      await page.evaluate(async (productId) => {
        const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
        await fetch("/api/admin/products/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
          body: JSON.stringify({ ids: [productId] }),
        });
      }, id);
    }
  });

  test("an empty category can be deleted, one that still holds products is refused with a reason", async ({ page }) => {
    const name = `Xoá thử ${Date.now().toString(36)}`;
    await page.goto("/admin/categories");
    await page.evaluate(async (categoryName) => {
      const token = decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? "");
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-XSRF-TOKEN": token },
        body: JSON.stringify({ name: categoryName }),
      });
      if (!response.ok) throw new Error(`create failed: ${response.status}`);
    }, name);
    await page.reload();

    await page.getByRole("button", { name: "Xóa Noel" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa danh mục" }).click();
    await expect(page.getByText(/còn \d+ sản phẩm/)).toBeVisible();
    await expect(page.getByRole("cell", { name: "Noel", exact: true })).toBeVisible();

    await page.getByRole("button", { name: `Xóa ${name}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Bỏ qua" }).click();
    await expect(page.getByRole("cell", { name, exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Xóa ${name}` }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Xóa danh mục" }).click();
    await expect(page.getByRole("cell", { name, exact: true })).toHaveCount(0);
    await page.screenshot({ path: path.join(SHOTS, "admin-category-delete.png") });
  });

  test("a price shows on the home and category cards right after saving", async ({ page }) => {
    let dialog = await openEditor(page);
    const original = await dialog.getByLabel("Giá").inputValue();
    await dialog.getByLabel("Giá").fill("125000");
    await save(dialog);

    for (const url of ["/", "/danh-muc/trung-thu", "/san-pham"]) {
      await page.goto(url);
      await expect(page.locator(".card", { hasText: name }).first().locator(".pr")).toContainText("125.000");
    }
    await page.screenshot({ path: path.join(SHOTS, "price-on-card.png") });

    dialog = await openEditor(page);
    await dialog.getByLabel("Giá").fill(original.replace(/\D/g, ""));
    await save(dialog);
    await page.goto("/danh-muc/trung-thu");
    await expect(page.locator(".card", { hasText: name }).first().locator(".pr")).not.toContainText("125.000");
  });

  test("extra photos appear as thumbnails on the product page, the card keeps the cover", async ({ page }) => {
    let dialog = await openEditor(page);
    const before = await dialog.getByRole("img", { name: "Ảnh đã chọn" }).count();
    await dialog.locator('input[type="file"]').setInputFiles(IMAGE);
    await expect(dialog.getByRole("img", { name: "Ảnh đã chọn" })).toHaveCount(before + 1);
    await page.screenshot({ path: path.join(SHOTS, "admin-gallery.png") });
    await save(dialog);

    await page.goto("/san-pham/long-den-trung-thu");
    const main = page.locator(".gal .main img");
    const cover = await main.getAttribute("src");
    await page.getByRole("button", { name: `Xem ảnh ${before + 1}` }).click();
    await expect(main).not.toHaveAttribute("src", cover ?? "");
    await page.screenshot({ path: path.join(SHOTS, "product-gallery.png") });

    dialog = await openEditor(page);
    await dialog.getByRole("button", { name: `Xóa ảnh ${before + 1}` }).click();
    await expect(dialog.getByRole("img", { name: "Ảnh đã chọn" })).toHaveCount(before);
    await save(dialog);
    await page.goto("/san-pham/long-den-trung-thu");
    await expect(page.getByRole("button", { name: `Xem ảnh ${before + 1}` })).toHaveCount(0);
  });
});

test("the admin product list lets you choose how many rows to show, and remembers it", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Tên đăng nhập").fill(USER);
  await page.getByLabel("Mật khẩu").fill(PASS);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForURL("**/admin/products");
  const rows = page.locator(".ant-table-tbody > tr.ant-table-row");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBe(15);

  await page.locator(".ant-pagination-options .ant-select").click();
  for (const option of ["15 dòng", "20 dòng", "30 dòng", "50 dòng", "100 dòng"]) await expect(page.getByRole("option", { name: option })).toBeAttached();
  await page.screenshot({ path: path.join(SHOTS, "admin-page-size.png") });
  await page.getByRole("option", { name: "20 dòng" }).click();
  await expect(rows).toHaveCount(20);

  await page.reload();
  await expect(rows).toHaveCount(20);
  await page.locator(".ant-pagination-options .ant-select").click();
  await page.getByRole("option", { name: "15 dòng" }).click();
  await expect(rows).toHaveCount(15);
});

test("the menu bar groups categories in a hover dropdown, four per row", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const bar = page.getByRole("navigation", { name: "Menu chính" });
  await expect(bar.locator(".mlinks a[href^='/danh-muc/']")).toHaveCount(0);
  const trigger = bar.getByRole("button", { name: "Danh mục sản phẩm" });
  await expect(trigger).toHaveAttribute("aria-expanded", "false");

  await trigger.hover();
  const panel = page.locator("#tp-dd-panel");
  await expect(panel).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const columns = await panel.locator(".tp-dd-grid").evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(4);
  await page.screenshot({ path: path.join(SHOTS, "nav-dropdown.png") });

  await page.mouse.move(700, 800);
  await expect(panel).toBeHidden();

  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();

  await trigger.hover();
  await panel.getByRole("link", { name: /Sinh nhật & Party/ }).click();
  await expect(page).toHaveURL(/\/danh-muc\/sinh-nhat-party$/);
  await expect(panel).toBeHidden();
});

test("the menu bar carries the company sections and stays pinned while scrolling", async ({ page }) => {
  for (const width of [1024, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.locator(".hd").getByRole("button", { name: /danh mục/i })).toHaveCount(0);
    const bar = page.getByRole("navigation", { name: "Menu chính" });
    for (const label of ["Trang chủ", "Sản phẩm", "Về chúng tôi", "Năng lực", "Liên hệ", "Liên hệ ngay"]) {
      await expect(bar.getByRole("link", { name: label, exact: true })).toBeInViewport();
    }
    await page.screenshot({ path: path.join(SHOTS, `menu-bar-${width}.png`) });
    await page.mouse.wheel(0, 1600);
    await expect.poll(async () => (await bar.boundingBox())?.y).toBe(0);
    await page.screenshot({ path: path.join(SHOTS, `menu-bar-scrolled-${width}.png`) });
  }
  // the home page holds both sections, so the links glide there without leaving the page
  // and exactly one menu item is lit: the section on screen, else the page
  const menu = page.getByRole("navigation", { name: "Menu chính" });
  const item = (name: string) => menu.locator(".mlinks").getByRole("link", { name, exact: true });
  const lit = menu.locator(".mlinks a.on");
  await menu.getByRole("link", { name: "Năng lực", exact: true }).click();
  const heading = page.locator("#nang-luc h2");
  await expect(heading).toBeInViewport();
  await expect.poll(async () => (await heading.boundingBox())!.y).toBeGreaterThan(44);
  await expect(page).toHaveURL(/\/$/);
  await expect(lit).toHaveCount(1);
  await expect(item("Năng lực")).toHaveClass(/\bon\b/);
  await page.screenshot({ path: path.join(SHOTS, "menu-active-section.png"), clip: { x: 0, y: 0, width: 1440, height: 120 } });
  await menu.getByRole("link", { name: "Liên hệ", exact: true }).click();
  await expect(page.locator("#lien-he h2")).toBeInViewport();
  await expect(page).toHaveURL(/\/$/);
  await expect(item("Liên hệ")).toHaveClass(/\bon\b/);
  await expect(lit).toHaveCount(1);

  // the contact band runs straight into the footer, with no strip of page colour between them
  const gap = await page.evaluate(() => {
    const band = document.querySelector("section.tp-cta")!.getBoundingClientRect();
    const footer = document.querySelector("footer.tp-ft")!.getBoundingClientRect();
    return Math.round(footer.top - band.bottom);
  });
  expect(gap).toBe(0);

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(item("Trang chủ")).toHaveClass(/\bon\b/);
  await expect(lit).toHaveCount(1);

  // on a page without the section it navigates, then lands on the contact band
  await page.goto("/san-pham");
  await menu.getByRole("link", { name: "Năng lực", exact: true }).click();
  await expect(page).toHaveURL(/\/gioi-thieu#nang-luc$/);
  await expect(page.locator("#nang-luc h2")).toBeInViewport();
  await page.goto("/san-pham");
  await menu.getByRole("link", { name: "Liên hệ", exact: true }).click();
  await expect(page.locator("#lien-he h2")).toBeInViewport();
  await expect(page.locator("section.tp-cta")).toHaveCount(1);
});

test("the capability section and footer follow the landing page, with the author credit", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/gioi-thieu#nang-luc");
  const capability = page.locator("#nang-luc");
  await expect(capability.getByRole("heading", { level: 2 })).toContainText("mỗi sản phẩm.");
  await expect(capability.locator(".tp-capx-list li")).toHaveCount(5);
  await expect(capability.locator(".tp-capx-list svg")).toHaveCount(5);
  await page.waitForFunction(() => [...document.querySelectorAll("#nang-luc img")].every((img) => (img as HTMLImageElement).complete));
  await page.screenshot({ path: path.join(SHOTS, "capability.png") });

  const footer = page.locator("footer.tp-ft");
  await expect(footer.getByRole("heading", { name: "Công ty" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Tất cả sản phẩm →" })).toHaveAttribute("href", "/san-pham");
  const credit = footer.locator(".tp-ft-credit");
  await expect(credit).toHaveText("Website được tạo bởi quangrainne: dinhnhatquan0311@gmail.com");
  await expect(credit.getByRole("link")).toHaveAttribute("href", "mailto:dinhnhatquan0311@gmail.com");
  await footer.scrollIntoViewIfNeeded();
  await footer.screenshot({ path: path.join(SHOTS, "footer.png") });
});

test("the process steps and the contact band with its map follow the landing page", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/gioi-thieu");
    const steps = page.locator("#quy-trinh .tp-flow li");
    await expect(steps).toHaveCount(5);
    await expect(page.locator("#quy-trinh .tp-flow svg")).toHaveCount(5);
    await page.locator("#quy-trinh").scrollIntoViewIfNeeded();
    await page.locator("#quy-trinh").screenshot({ path: path.join(SHOTS, `process-${width}.png`) });

    const band = page.locator("section.tp-cta");
    await expect(band.getByRole("heading", { level: 2 })).toContainText("nguồn hàng decor?");
    await expect(band.locator(".tp-cta-cards li")).toHaveCount(4);
    await expect(band.getByRole("link", { name: "Liên hệ ngay" })).toHaveAttribute("href", /^tel:/);
    await expect(band.getByRole("link", { name: "Xem đường đi →" })).toHaveAttribute("href", "https://maps.app.goo.gl/sTq4fzmAe5UbG6Yt9");
    await expect(band.locator("iframe.tp-cta-mapf")).toHaveAttribute("src", /^https:\/\/www\.google\.com\/maps\/embed/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await band.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await band.screenshot({ path: path.join(SHOTS, `contact-band-${width}.png`) });
  }
  await page.goto("/lien-he");
  await expect(page.locator("section.tp-cta iframe.tp-cta-mapf")).toHaveCount(1);
});

test("sales pages and sales API are closed", async ({ page, request }) => {
  await page.goto("/gio-hang");
  await expect(page).toHaveURL(/\/lien-he$/);
  await page.goto("/bao-gia");
  await expect(page).toHaveURL(/\/lien-he$/);
  expect((await request.post("/api/public/orders", { data: {} })).status()).toBe(404);
  expect((await request.post("/api/public/quotes", { data: {} })).status()).toBe(404);
});
