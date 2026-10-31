// Creates a small, clearly labelled demo set through the public/admin API so the admin queue is not empty:
//   order A pending (bank transfer), order B confirmed (QR visible) + a short transfer waiting in the review queue,
//   order C confirmed COD, quote D new with a "Liên hệ" line, quote E already quoted.
// Usage: node scripts/seed-demo.mjs   (env: BASE_URL, ADMIN_USER, ADMIN_PASS, SEPAY_KEY, SEPAY_ACCOUNT, FORCE=1)
// Skips when the queue already has requests (unless FORCE=1). Dev data only.

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const ADMIN_USER = process.env.ADMIN_USER ?? "owner";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "Dna-Dev-2026-Owner!";
const SEPAY_KEY = process.env.SEPAY_KEY ?? "dev-sepay-key-change-me";
const SEPAY_ACCOUNT = process.env.SEPAY_ACCOUNT ?? "0123456789";

const jar = new Map();
function absorb(res) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    if (/max-age=0/i.test(line) || value === "") jar.delete(name);
    else jar.set(name, value);
  }
}
async function call(method, path, { json, form, headers = {}, cookies = false } = {}) {
  const h = { Accept: "application/json", ...headers };
  if (cookies && jar.size) h.Cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  let body;
  if (json !== undefined) {
    h["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    h["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(BASE + path, { method, headers: h, body, redirect: "manual" });
  if (cookies) absorb(res);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (res.status >= 400) throw new Error(`${method} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return { status: res.status, data };
}
const admin = (method, path, json) =>
  call(method, path, { json, cookies: true, headers: method === "GET" ? {} : { "X-XSRF-TOKEN": jar.get("XSRF-TOKEN") ?? "" } });

async function skuIds(query) {
  const found = await call("GET", `/api/public/search?q=${encodeURIComponent(query)}`);
  const product = await call("GET", `/api/public/products/${found.data.items[0].slug}`);
  return product.data.skus;
}

await call("GET", "/api/auth/csrf", { cookies: true });
await call("POST", "/api/auth/login", { form: { username: ADMIN_USER, password: ADMIN_PASS }, cookies: true, headers: { "X-XSRF-TOKEN": jar.get("XSRF-TOKEN") ?? "" } });
await call("GET", "/api/auth/csrf", { cookies: true });

const existing = await admin("GET", "/api/admin/requests?size=1");
if (existing.data.total > 0 && process.env.FORCE !== "1") {
  console.log(`Queue already has ${existing.data.total} requests: demo data skipped (FORCE=1 to add anyway).`);
  process.exit(0);
}

const sv6c = await skuIds("SV6C");
const sv320 = await skuIds("SV320-3L");
const r20s = await skuIds("R20S");
const sv465 = await skuIds("SV465");
const gp15a = await skuIds("GP15A");
const uuid = () => crypto.randomUUID();
const orderBody = (name, phone, address, paymentMethod, lines, expectedTotal) => ({ submissionId: uuid(), customerName: name, phone, address, paymentMethod, expectedTotal, lines, website: "" });
const priceOf = async (lines) => (await call("POST", "/api/public/cart/price", { json: { lines } })).data.total;
const placeOrder = async (name, phone, address, method, lines) => (await call("POST", "/api/public/orders", { json: orderBody(name, phone, address, method, lines, await priceOf(lines)) })).data;
const orderId = async (code) => (await admin("GET", `/api/admin/requests?kind=ORDER&q=${code}`)).data.items.find((r) => r.code === code).id;
const transition = (id, body) => admin("POST", `/api/admin/orders/${id}/transition`, body);

const summary = [];

// A: bank transfer, still waiting for the staff to confirm (customer sees account number + content as text, no QR)
const a = await placeOrder("Nguyễn Văn An (demo)", "0901000001", "Số 12, đường Nguyễn Tất Thành, TP Việt Trì, Phú Thọ", "BANK_TRANSFER", [
  { skuId: sv6c.find((s) => s.isBase).id, qty: 10 },
  { skuId: sv320.find((s) => s.conversion === 5).id, qty: 2 },
]);
summary.push(["A  Chờ xác nhận (chuyển khoản, chưa có QR)", a.code, "0901000001", a.total]);

// B: confirmed with shipping fee (customer sees the QR), plus a short transfer that lands in the review queue
const b = await placeOrder("Trần Thị Bình (demo)", "0901000002", "Kho số 3, KCN Thụy Vân, Phú Thọ", "BANK_TRANSFER", [
  { skuId: r20s.find((s) => s.isBase).id, qty: 4 },
  { skuId: r20s.find((s) => !s.isBase).id, qty: 1 },
  { skuId: gp15a.find((s) => s.isBase).id, qty: 5 },
]);
const bConfirmed = (await transition(await orderId(b.code), { to: "CONFIRMED", shippingFee: 45000 })).data;
await call("POST", "/api/webhooks/bank/sepay", {
  headers: { Authorization: `Apikey ${SEPAY_KEY}` },
  json: { id: Date.now(), gateway: "MBBank", transactionDate: "2026-10-31 15:00:00", accountNumber: SEPAY_ACCOUNT, content: `TRAN THI BINH chuyen tien ${b.code}`, transferType: "in", transferAmount: bConfirmed.total - 5000, referenceCode: `DEMO${Date.now()}` },
});
summary.push(["B  Đã xác nhận (có QR) + 1 giao dịch lệch tiền ở hàng chờ đối soát", b.code, "0901000002", bConfirmed.total]);

// C: cash on delivery, confirmed, waiting to be entered into KiotViet
const c = await placeOrder("Lê Văn Cường (demo)", "0901000003", "Số 7, phố Hùng Vương, TX Phú Thọ", "COD", [{ skuId: sv6c.find((s) => !s.isBase).id, qty: 2 }]);
await transition(await orderId(c.code), { to: "CONFIRMED", shippingFee: 0 });
summary.push(["C  COD đã xác nhận (chờ nhập KiotViet)", c.code, "0901000003", c.total]);

// D: quote request with a "Liên hệ" line (SV465 Thùng) => quoted by staff; E: already quoted
const hiddenSv465 = sv465.find((s) => !s.priceVisible);
const quoteBody = (name, phone, company, lines) => ({ submissionId: uuid(), customerName: name, phone, company, lines, website: "" });
const d = (await call("POST", "/api/public/quotes", { json: quoteBody("Cửa hàng Minh Châu (demo)", "0901000004", "Cửa hàng Minh Châu", [{ skuId: sv465.find((s) => s.isBase).id, qty: 20 }, { skuId: hiddenSv465.id, qty: 3 }]) })).data;
summary.push(["D  Báo giá mới (có mặt hàng Liên hệ)", d.code, "0901000004", d.subtotal]);
const e = (await call("POST", "/api/public/quotes", { json: quoteBody("Công ty TNHH Bình An (demo)", "0901000005", "Công ty TNHH Bình An", [{ skuId: sv6c.find((s) => !s.isBase).id, qty: 30 }, { skuId: r20s.find((s) => !s.isBase).id, qty: 10 }]) })).data;
const eRow = (await admin("GET", `/api/admin/requests?kind=QUOTE&q=${e.code}`)).data.items.find((r) => r.code === e.code);
await admin("POST", `/api/admin/quotes/${eRow.id}/transition`, { to: "QUOTED" });
summary.push(["E  Báo giá đã báo giá", e.code, "0901000005", e.subtotal]);

console.log("Demo data created (customer view: Tra cứu đơn with the code + phone below):\n");
for (const [label, code, phone, total] of summary) console.log(`  ${label}\n     mã ${code}   SĐT ${phone}   ${total.toLocaleString("vi-VN")}đ`);
