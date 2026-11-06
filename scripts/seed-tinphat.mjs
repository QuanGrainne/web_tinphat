// Loads the Tín Phát Decord categories and products through the admin API, uploading the images from the landing page.
// Usage: node scripts/seed-tinphat.mjs   (env: BASE_URL, ADMIN_USER, ADMIN_PASS, IMAGES_DIR)
// Safe to run again: categories and products that already exist (same name) are skipped.
import { readFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const ADMIN_USER = process.env.ADMIN_USER ?? "owner";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "Dna-Dev-2026-Owner!";
const IMAGES_DIR =
  process.env.IMAGES_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "..", "landingpage_TinPhatDecord", "public", "images");

const CATEGORIES = [
  { name: "Noel", image: "categories/noel.jpg", description: "Kim tuyến chồn và các sản phẩm trang trí Giáng Sinh cao cấp." },
  { name: "Trung Thu", image: "categories/trung-thu.jpg", description: "Đèn lồng và các sản phẩm trang trí Tết Trung Thu rực rỡ." },
  { name: "Tết", image: "categories/tet.png", description: "Câu đối, ông thần tài lắc và trang trí Tết Nguyên Đán." },
  { name: "Sinh nhật & Party", image: "categories/sinh-nhat.jpg", description: "Mũ sinh nhật, nến, phụ kiện trang trí bánh, banner và đạo cụ tiệc." },
  { name: "Đồ chơi trẻ em", image: "categories/do-choi.jpg", description: "Xe ô tô đồ chơi và các sản phẩm vui chơi dành cho trẻ em." },
  { name: "Decor quanh năm", image: "categories/decor-quanh-nam.png", description: "Các sản phẩm trang trí không phụ thuộc mùa lễ hội, dùng quanh năm." },
];

const PRODUCTS = [
  { code: "NOEL-001", name: "Kim tuyến chồn Noel", category: "Noel", image: "products/noel-kim-tuyen-chon.jpg", description: "Kim tuyến chồn cao cấp dùng trang trí cây thông, không gian Noel." },
  { code: "NOEL-002", name: "Vòng nguyệt quế", category: "Noel", image: "products/noel-vong-nguyet-que.jpg", description: "Vòng nguyệt quế trang trí Noel, treo cửa và trang hoàng không gian Giáng Sinh." },
  { code: "TT-001", name: "Lồng đèn Trung Thu", category: "Trung Thu", image: "products/trung-thu-long-den.jpg", description: "Lồng đèn truyền thống và hiện đại, đa dạng mẫu mã dịp Trung Thu." },
  { code: "TET-001", name: "Câu đối Tết", category: "Tết", image: "products/tet-cau-doi.png", description: "Câu đối trang trí Tết Nguyên Đán, đa dạng kích thước và nội dung." },
  { code: "TET-002", name: "Ông thần tài lắc", category: "Tết", image: "products/tet-ong-than-tai-lac.jpg", description: "Ông thần tài lắc phong thủy may mắn, dùng trang trí dịp Tết." },
  { code: "SN-001", name: "Mũ sinh nhật", category: "Sinh nhật & Party", image: "products/birthday-mu-sinh-nhat.jpg", description: "Mũ sinh nhật đa màu sắc, phù hợp tiệc sinh nhật trẻ em và người lớn." },
  { code: "SN-002", name: "Nến sinh nhật", category: "Sinh nhật & Party", image: "products/birthday-nen.jpg", description: "Nến sinh nhật đủ số, hình dạng và màu sắc đa dạng." },
  { code: "SN-003", name: "Phụ kiện trang trí bánh", category: "Sinh nhật & Party", image: "products/birthday-trang-tri-banh.jpg", description: "Topper bánh, trang trí bánh sinh nhật, cắm bánh theo chủ đề." },
  { code: "SN-004", name: "Banner trang trí & Party", category: "Sinh nhật & Party", image: "products/birthday-banner.jpg", description: "Banner, dây chữ trang trí tiệc và các dịp đặc biệt." },
  { code: "DC-001", name: "Xe ô tô đồ chơi", category: "Đồ chơi trẻ em", image: "products/toy-xe-o-to.jpg", description: "Xe ô tô đồ chơi đa dạng mẫu mã, phù hợp nhiều lứa tuổi." },
  { code: "DE-001", name: "Ống Phụt Giấy đám cưới", category: "Decor quanh năm", image: "products/ong-phut-giay.jpg", description: "Ống phụt kim tuyến, pháo giấy phụt trang trí tiệc cưới, sự kiện và liên hoan." },
];

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
const jar = new Map();

function absorb(res) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    const value = pair.slice(i + 1).trim();
    if (value === "") jar.delete(pair.slice(0, i).trim());
    else jar.set(pair.slice(0, i).trim(), value);
  }
}

async function call(method, path, { json, form, multipart } = {}) {
  const headers = { Accept: "application/json", Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") };
  if (method !== "GET" && jar.has("XSRF-TOKEN")) headers["X-XSRF-TOKEN"] = decodeURIComponent(jar.get("XSRF-TOKEN"));
  let body = multipart;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
  absorb(res);
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

async function upload(relative) {
  const bytes = await readFile(join(IMAGES_DIR, relative));
  const multipart = new FormData();
  multipart.append("file", new Blob([bytes], { type: MIME[extname(relative).toLowerCase()] }), basename(relative));
  return (await call("POST", "/api/admin/uploads/images", { multipart })).url;
}

await call("GET", "/api/auth/csrf");
await call("POST", "/api/auth/login", { form: { username: ADMIN_USER, password: ADMIN_PASS } });
await call("GET", "/api/auth/csrf");

const existing = await call("GET", "/api/admin/categories");
const categoryIds = new Map(existing.map((c) => [c.name, c.id]));
let order = 0;
for (const category of CATEGORIES) {
  if (!categoryIds.has(category.name)) {
    const created = await call("POST", "/api/admin/categories", {
      json: { name: category.name, description: category.description, imageUrl: await upload(category.image) },
    });
    categoryIds.set(category.name, created.id);
    await call("PUT", `/api/admin/categories/${created.id}`, {
      json: { name: created.name, description: category.description, imageUrl: created.imageUrl, visible: true, sortOrder: order },
    });
    console.log(`category  ${category.name}`);
  }
  order += 1;
}

const known = new Set((await call("GET", "/api/admin/products?size=200")).items.map((p) => p.name));
for (const product of PRODUCTS) {
  if (known.has(product.name)) continue;
  const created = await call("POST", "/api/admin/products", {
    json: {
      name: product.name,
      categoryId: categoryIds.get(product.category),
      descriptionMd: product.description,
      imageUrl: await upload(product.image),
      skus: [{ code: product.code, unitName: "Sản phẩm", conversion: 1, isBase: true, price: null, visible: true }],
    },
  });
  await call("POST", `/api/admin/products/${created.id}/publish`);
  console.log(`product   ${product.name}`);
}
console.log("done");
