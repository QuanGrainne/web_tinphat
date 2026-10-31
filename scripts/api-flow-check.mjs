// End-to-end API check against a running stack (default http://localhost:8000 via Caddy).
// Usage: node scripts/api-flow-check.mjs   (env: BASE_URL, ADMIN_USER, ADMIN_PASS, SEPAY_KEY, SEPAY_ACCOUNT, MAILPIT_URL)
// Walks: catalogue -> hidden-price redaction -> quote -> order (idempotency, tamper) -> lookup -> admin flow
// -> QR timing -> SePay webhook (exact match auto-PAID, mismatch REVIEW) -> remaining statuses -> price edit history -> mail.

const BASE = process.env.BASE_URL ?? "http://localhost:8000";
const ADMIN_USER = process.env.ADMIN_USER ?? "owner";
const ADMIN_PASS = process.env.ADMIN_PASS ?? "Dna-Dev-2026-Owner!";
const SEPAY_KEY = process.env.SEPAY_KEY ?? "dev-sepay-key-change-me";
const SEPAY_ACCOUNT = process.env.SEPAY_ACCOUNT ?? "0123456789";
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";

let failed = 0;
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok });
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? `\n      ${detail}` : ""}`);
  return ok;
}

class Jar {
  cookies = new Map();
  absorb(res) {
    for (const line of res.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i).trim();
      const value = pair.slice(i + 1).trim();
      if (/;\s*max-age=0/i.test(line) || value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

async function call(jar, method, path, { json, form, headers = {}, raw = false } = {}) {
  const h = { Accept: "application/json", ...headers };
  if (jar?.cookies.size) h.Cookie = jar.header();
  let body;
  if (json !== undefined) {
    h["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    h["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  }
  const res = await fetch(path.startsWith("http") ? path : BASE + path, { method, headers: h, body, redirect: "manual" });
  jar?.absorb(res);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { status: res.status, data, text, headers: res.headers, raw };
}

const pub = new Jar();
const admin = new Jar();
const uuid = () => crypto.randomUUID();
const phone = "0912345678";

async function adminCall(method, path, json) {
  const token = admin.cookies.get("XSRF-TOKEN") ?? "";
  return call(admin, method, path, { json, headers: method === "GET" ? {} : { "X-XSRF-TOKEN": token } });
}

function normalizeOrderLines(lines) {
  return lines.map((l) => ({ skuId: l.skuId, qty: l.qty }));
}

try {
  // ---- catalogue ----
  const settings = await call(pub, "GET", "/api/public/settings");
  check("public settings: company + hotline", settings.status === 200 && settings.data?.company?.taxCode === "5400533724" && !!settings.data?.hotline, settings.text.slice(0, 200));

  const nav = await call(pub, "GET", "/api/public/nav");
  check("nav: 6 level-1 categories", nav.status === 200 && nav.data?.categories?.length === 6, `got ${nav.data?.categories?.length}`);

  const home = await call(pub, "GET", "/api/public/home");
  check("home: sections with cards", home.status === 200 && (home.data?.sections?.length ?? 0) >= 1, home.text.slice(0, 200));

  const sv6c = await call(pub, "GET", "/api/public/search?q=SV6C");
  const sv6cSlug = sv6c.data?.items?.[0]?.slug;
  check("search SV6C finds a product", sv6c.status === 200 && !!sv6cSlug, sv6c.text.slice(0, 200));
  const sv6cProduct = await call(pub, "GET", `/api/public/products/${sv6cSlug}`);
  const skus = sv6cProduct.data?.skus ?? [];
  const base = skus.find((s) => s.isBase);
  const pack = skus.find((s) => !s.isBase);
  check("SV6C: base Gói 31.000 and Cây 364.750", base?.price === 31000 && pack?.price === 364750 && pack?.conversion === 12, JSON.stringify(skus.map((s) => [s.code, s.price, s.conversion])));
  check("SV6C Cây: saving 1.9% PERCENT", pack?.saving?.kind === "PERCENT" && Math.abs((pack?.saving?.pct ?? 0) - 1.9) < 0.001, JSON.stringify(pack?.saving));
  check("SV6C Cây: perBaseUnit 30.396", pack?.perBaseUnit === 30396 || pack?.perBaseUnit === 30396.0, String(pack?.perBaseUnit));

  const sv320 = await call(pub, "GET", "/api/public/search?q=SV320-3L");
  const sv320Product = await call(pub, "GET", `/api/public/products/${sv320.data?.items?.[0]?.slug}`);
  const sv320Dây = (sv320Product.data?.skus ?? []).find((s) => s.conversion === 5);
  check("SV320 Dây: Bằng giá mua lẻ (EQUAL)", sv320Dây?.saving?.kind === "EQUAL", JSON.stringify(sv320Dây?.saving));

  const napkin = await call(pub, "GET", "/api/public/search?q=SV300-3L");
  const napkinProduct = await call(pub, "GET", `/api/public/products/${napkin.data?.items?.[0]?.slug}`);
  check("175x120 napkin priced (3.229 / 32.290), not hidden", (napkinProduct.data?.skus ?? []).every((s) => s.priceVisible) && (napkinProduct.data?.skus ?? []).some((s) => s.price === 3229), JSON.stringify(napkinProduct.data?.skus?.map((s) => [s.code, s.price, s.priceVisible])));

  // ---- hidden price redaction ----
  const sv465 = await call(pub, "GET", "/api/public/search?q=SV465");
  const sv465Slug = sv465.data?.items?.[0]?.slug;
  const sv465Product = await call(pub, "GET", `/api/public/products/${sv465Slug}`);
  const hidden = (sv465Product.data?.skus ?? []).filter((s) => !s.priceVisible);
  check("SV465: Thùng + Dây 8 are Liên hệ (priceVisible=false, all price fields null)", hidden.length === 2 && hidden.every((s) => s.price === null && s.effectivePrice === null && s.perBaseUnit === null && s.promoPrice === null && s.saving?.kind === "NONE"), JSON.stringify(hidden));
  const leakTargets = ["426400", "426.400", "42640", "42.640"];
  const leakBodies = [sv465Product.text, sv465.text, (await call(pub, "GET", "/api/public/home")).text, (await call(pub, "GET", "/api/public/sitemap")).text];
  const cat = nav.data?.categories?.[0];
  if (cat) leakBodies.push((await call(pub, "GET", `/api/public/categories/${cat.slug}`)).text);
  const leaked = leakTargets.filter((t) => leakBodies.some((b) => b.includes(t)));
  check("SV465 hidden prices never appear in public JSON", leaked.length === 0, `leaked: ${leaked.join(",")}`);
  const hiddenSku = hidden[0];

  // ---- cart price + quote ----
  const priced = await call(pub, "POST", "/api/public/cart/price", { json: { lines: [{ skuId: base.id, qty: 3 }, { skuId: hiddenSku.id, qty: 2 }] } });
  check("cart price: hidden line excluded from totals, hasContactLines", priced.status === 200 && priced.data?.subtotal === 93000 && priced.data?.hasContactLines === true, priced.text.slice(0, 300));
  check("cart price: hidden line has null prices and is not orderable", (() => { const l = priced.data?.lines?.find((x) => x.skuId === hiddenSku.id); return l && l.priceVisible === false && l.unitPrice === null && l.orderable === false; })(), priced.text.slice(0, 400));
  check("cart price body has no hidden price", !leakTargets.some((t) => priced.text.includes(t)));

  const quoteId = uuid();
  const quoteBody = { submissionId: quoteId, customerName: "Nguyễn Văn Kiểm Thử", phone, company: "Cửa hàng thử", lines: [{ skuId: base.id, qty: 3 }, { skuId: hiddenSku.id, qty: 2 }], website: "" };
  const quote = await call(pub, "POST", "/api/public/quotes", { json: quoteBody });
  check("quote submit 201 with BG code, hasContactLines", quote.status === 201 && /^BG[0-9A-HJKMNP-TV-Z]{6}$/.test(quote.data?.code ?? "") && quote.data?.hasContactLines === true, quote.text.slice(0, 300));
  const quoteReplay = await call(pub, "POST", "/api/public/quotes", { json: quoteBody });
  check("quote replay (same submissionId) returns the same quote", quoteReplay.status === 200 && quoteReplay.data?.code === quote.data?.code, quoteReplay.text.slice(0, 200));
  const honeypot = await call(pub, "POST", "/api/public/quotes", { json: { ...quoteBody, submissionId: uuid(), website: "spam.example" } });
  check("honeypot filled -> 400", honeypot.status === 400, `status ${honeypot.status}`);

  // ---- order: tamper, idempotency, lookup ----
  const orderLines = [{ skuId: base.id, qty: 3 }];
  const tampered = await call(pub, "POST", "/api/public/orders", { json: { submissionId: uuid(), customerName: "Trần Thị Thử", phone, address: "Số 1, Phú Thọ", paymentMethod: "BANK_TRANSFER", expectedTotal: 1000, lines: orderLines, website: "" } });
  check("order with tampered expectedTotal -> 409 PRICE_CHANGED + pricedCart", tampered.status === 409 && tampered.data?.code === "PRICE_CHANGED" && tampered.data?.pricedCart?.total === 93000, tampered.text.slice(0, 300));
  const orderId = uuid();
  const orderBody = { submissionId: orderId, customerName: "Trần Thị Thử", phone, address: "Số 1, Phú Thọ", note: "Giao giờ hành chính", paymentMethod: "BANK_TRANSFER", expectedTotal: 93000, lines: orderLines, website: "" };
  const order = await call(pub, "POST", "/api/public/orders", { json: orderBody });
  const code = order.data?.code;
  check("order submit 201: DNA code, PENDING, total 93.000", order.status === 201 && /^DNA[0-9A-HJKMNP-TV-Z]{6}$/.test(code ?? "") && order.data?.status === "PENDING" && order.data?.total === 93000, order.text.slice(0, 400));
  check("PENDING bank block: account + content=code, NO QR amount", order.data?.bank?.content === code && !!order.data?.bank?.accountNo && order.data?.qrAmount === null, JSON.stringify(order.data?.bank) + " qr=" + order.data?.qrAmount);
  check("order view masks phone and has no address", /\*\*\*/.test(order.data?.phoneMasked ?? "") && !order.text.includes("Số 1, Phú Thọ"), order.data?.phoneMasked);
  const replay = await call(pub, "POST", "/api/public/orders", { json: orderBody });
  check("order replay -> 200, same code (no duplicate)", replay.status === 200 && replay.data?.code === code, replay.text.slice(0, 200));
  const hiddenOrder = await call(pub, "POST", "/api/public/orders", { json: { ...orderBody, submissionId: uuid(), lines: [{ skuId: hiddenSku.id, qty: 1 }], expectedTotal: 0 } });
  check("order with Liên hệ SKU rejected (422 SKU_NOT_ORDERABLE)", hiddenOrder.status === 422 && hiddenOrder.data?.code === "SKU_NOT_ORDERABLE", hiddenOrder.text.slice(0, 200));
  const lookup = await call(pub, "POST", "/api/public/orders/lookup", { json: { code: code.toLowerCase(), phone: "+84912345678" } });
  check("lookup by code (lower case) + phone (+84) works", lookup.status === 200 && lookup.data?.code === code, lookup.text.slice(0, 200));
  const badLookup = await call(pub, "POST", "/api/public/orders/lookup", { json: { code, phone: "0987654321" } });
  const badLookup2 = await call(pub, "POST", "/api/public/orders/lookup", { json: { code: "DNA000000", phone } });
  check("lookup mismatch -> 404 with identical generic body", badLookup.status === 404 && badLookup2.status === 404 && badLookup.text === badLookup2.text, `${badLookup.text} | ${badLookup2.text}`);

  // ---- admin login ----
  await call(admin, "GET", "/api/auth/csrf");
  const unauth = await call(null, "GET", "/api/admin/me");
  check("admin API unauthenticated -> 401 problem+json UNAUTHENTICATED", unauth.status === 401 && unauth.data?.code === "UNAUTHENTICATED" && /problem\+json/.test(unauth.headers.get("content-type") ?? ""), unauth.text.slice(0, 200));
  const noCsrf = await call(admin, "POST", "/api/auth/login", { form: { username: ADMIN_USER, password: ADMIN_PASS } });
  check("login without CSRF header -> 403", noCsrf.status === 403, `status ${noCsrf.status}`);
  const bad = await call(admin, "POST", "/api/auth/login", { form: { username: ADMIN_USER, password: "wrong-password-123" }, headers: { "X-XSRF-TOKEN": admin.cookies.get("XSRF-TOKEN") ?? "" } });
  const bad2 = await call(admin, "POST", "/api/auth/login", { form: { username: "nobody", password: "wrong-password-123" }, headers: { "X-XSRF-TOKEN": admin.cookies.get("XSRF-TOKEN") ?? "" } });
  check("wrong password and unknown user -> identical 401 body", bad.status === 401 && bad2.status === 401 && bad.text === bad2.text, `${bad.text} | ${bad2.text}`);
  const login = await call(admin, "POST", "/api/auth/login", { form: { username: ADMIN_USER, password: ADMIN_PASS }, headers: { "X-XSRF-TOKEN": admin.cookies.get("XSRF-TOKEN") ?? "" } });
  check("admin login 200 MANAGER", login.status === 200 && login.data?.role === "MANAGER", login.text.slice(0, 200));
  if (login.status !== 200) throw new Error("cannot continue without an admin session");
  await call(admin, "GET", "/api/auth/csrf");

  // ---- admin: find order, confirm with fee, QR timing ----
  const list = await adminCall("GET", `/api/admin/requests?kind=ORDER&q=${code}`);
  const row = list.data?.items?.find((r) => r.code === code);
  check("admin requests list finds the order (PENDING)", list.status === 200 && row?.status === "PENDING", list.text.slice(0, 300));
  const counters = await adminCall("GET", "/api/admin/requests/counters");
  check("counters: pendingOrders >= 1, newQuotes >= 1", counters.status === 200 && counters.data?.pendingOrders >= 1 && counters.data?.newQuotes >= 1, counters.text);
  let detail = await adminCall("GET", `/api/admin/orders/${row.id}`);
  const confirmTransition = detail.data?.allowedTransitions?.find((t) => t.to === "CONFIRMED");
  check("order detail: CONFIRMED allowed and requires shippingFee", detail.status === 200 && confirmTransition?.requires?.includes("shippingFee"), JSON.stringify(detail.data?.allowedTransitions));
  const missingFee = await adminCall("POST", `/api/admin/orders/${row.id}/transition`, { to: "CONFIRMED" });
  check("confirm without shipping fee rejected (4xx)", missingFee.status >= 400 && missingFee.status < 500, `status ${missingFee.status}`);
  const confirmed = await adminCall("POST", `/api/admin/orders/${row.id}/transition`, { to: "CONFIRMED", shippingFee: 30000 });
  check("confirm with fee 30.000 -> CONFIRMED, total 123.000", confirmed.status === 200 && confirmed.data?.status === "CONFIRMED" && confirmed.data?.total === 123000, confirmed.text.slice(0, 300));
  const afterConfirm = await call(pub, "POST", "/api/public/orders/lookup", { json: { code, phone } });
  check("after confirm: qrAmount = 123.000 and bank block present", afterConfirm.data?.qrAmount === 123000 && afterConfirm.data?.bank?.content === code, afterConfirm.text.slice(0, 300));

  // ---- SePay webhook: unauthenticated, mismatch -> REVIEW, exact -> PAID ----
  const txBase = Date.now();
  const hook = (id, amount, content, extra = {}) => call(null, "POST", "/api/webhooks/bank/sepay", { json: { id, gateway: "MBBank", transactionDate: "2026-10-31 15:00:00", accountNumber: SEPAY_ACCOUNT, content, transferType: "in", transferAmount: amount, referenceCode: "FT" + id, ...extra }, headers: { Authorization: `Apikey ${SEPAY_KEY}` } });
  const noKey = await call(null, "POST", "/api/webhooks/bank/sepay", { json: { id: txBase, accountNumber: SEPAY_ACCOUNT, content: code, transferType: "in", transferAmount: 123000 } });
  check("webhook without API key -> 401", noKey.status === 401, `status ${noKey.status}`);
  const wrong = await hook(txBase + 1, 122999, `${code} chuyen tien`);
  check("webhook wrong amount -> 200 (stored), order NOT paid", wrong.status === 200 && wrong.data?.success === true, wrong.text);
  detail = await adminCall("GET", `/api/admin/orders/${row.id}`);
  check("order still CONFIRMED after mismatched transfer", detail.data?.status === "CONFIRMED", detail.data?.status);
  const review = await adminCall("GET", "/api/admin/bank-transactions?status=REVIEW");
  const reviewRow = review.data?.items?.find((t) => t.amount === 122999);
  check("REVIEW queue has the mismatched transfer with AMOUNT_MISMATCH", review.status === 200 && reviewRow?.reviewReason === "AMOUNT_MISMATCH", review.text.slice(0, 300));
  const exact = await hook(txBase + 2, 123000, `Khach ${code.toLowerCase()} thanh toan don hang`);
  check("webhook exact match -> 200", exact.status === 200 && exact.data?.success === true, exact.text);
  const dup = await hook(txBase + 2, 123000, `Khach ${code} thanh toan don hang`);
  check("webhook replay of the same vendor id -> 200 no-op", dup.status === 200, dup.text);
  detail = await adminCall("GET", `/api/admin/orders/${row.id}`);
  check("exact transfer auto-marks PAID via BANK_WEBHOOK with paidAmount", detail.data?.status === "PAID" && detail.data?.paidVia === "BANK_WEBHOOK" && detail.data?.paidAmount === 123000, JSON.stringify({ s: detail.data?.status, v: detail.data?.paidVia, a: detail.data?.paidAmount }));
  check("history records actor BANK_WEBHOOK", (detail.data?.history ?? []).some((h) => /BANK_WEBHOOK/.test(h.actor ?? "")), JSON.stringify(detail.data?.history));
  if (reviewRow) {
    const dismissed = await adminCall("POST", `/api/admin/bank-transactions/${reviewRow.id}/dismiss`, { note: "Kiểm thử: chuyển thiếu" });
    check("dismiss REVIEW transaction", dismissed.status === 200 && dismissed.data?.status === "IGNORED", dismissed.text.slice(0, 200));
  }
  const paidView = await call(pub, "POST", "/api/public/orders/lookup", { json: { code, phone } });
  check("paid order: customer view has no bank block and no QR", paidView.data?.status === "PAID" && paidView.data?.bank === null && paidView.data?.qrAmount === null, paidView.text.slice(0, 300));

  // ---- rest of the flow ----
  const noKiot = await adminCall("POST", `/api/admin/orders/${row.id}/transition`, { to: "ENTERED_KIOTVIET" });
  check("ENTERED_KIOTVIET without KiotViet code rejected", noKiot.status >= 400 && noKiot.status < 500, `status ${noKiot.status}`);
  for (const step of [{ to: "ENTERED_KIOTVIET", kiotvietOrderCode: "HD000123" }, { to: "SHIPPING" }, { to: "COMPLETED" }]) {
    const r = await adminCall("POST", `/api/admin/orders/${row.id}/transition`, step);
    check(`transition -> ${step.to}`, r.status === 200 && r.data?.status === step.to, r.text.slice(0, 200));
  }
  const done = await adminCall("POST", `/api/admin/orders/${row.id}/transition`, { to: "CANCELLED", note: "x" });
  check("completed order is terminal (cancel rejected)", done.status >= 400 && done.status < 500, `status ${done.status}`);

  // ---- COD order cannot be PAID ----
  const cod = await call(pub, "POST", "/api/public/orders", { json: { ...orderBody, submissionId: uuid(), paymentMethod: "COD" } });
  check("COD order has no bank block", cod.status === 201 && cod.data?.bank === null, cod.text.slice(0, 200));
  const codRow = (await adminCall("GET", `/api/admin/requests?kind=ORDER&q=${cod.data?.code}`)).data?.items?.[0];
  await adminCall("POST", `/api/admin/orders/${codRow.id}/transition`, { to: "CONFIRMED", shippingFee: 0 });
  const codDetail = await adminCall("GET", `/api/admin/orders/${codRow.id}`);
  check("COD order never offers PAID", !(codDetail.data?.allowedTransitions ?? []).some((t) => t.to === "PAID") && codDetail.data?.awaitsKiotVietEntry === true, JSON.stringify(codDetail.data?.allowedTransitions));

  // ---- quote admin flow ----
  const quoteRow = (await adminCall("GET", `/api/admin/requests?kind=QUOTE&q=${quote.data?.code}`)).data?.items?.[0];
  const quoteDetail = await adminCall("GET", `/api/admin/quotes/${quoteRow.id}`);
  check("admin quote detail: contact line has null price", quoteDetail.status === 200 && quoteDetail.data?.lines?.some((l) => l.unitPrice === null), quoteDetail.text.slice(0, 300));
  const q1 = await adminCall("POST", `/api/admin/quotes/${quoteRow.id}/transition`, { to: "QUOTED" });
  const q2 = await adminCall("POST", `/api/admin/quotes/${quoteRow.id}/transition`, { to: "WON" });
  check("quote NEW -> QUOTED -> WON", q1.data?.status === "QUOTED" && q2.data?.status === "WON", `${q1.text.slice(0, 120)} ${q2.text.slice(0, 120)}`);

  // ---- admin catalogue: product list, price edit with history ----
  const products = await adminCall("GET", "/api/admin/products?size=100");
  check("admin products: 32 products, 69 SKUs", products.status === 200 && products.data?.totals?.products === 32 && products.data?.totals?.skus === 69, JSON.stringify(products.data?.totals));
  const sv465Row = products.data?.items?.find((p) => /SV465/.test(p.baseCode ?? ""));
  check("SV465 flagged needsConfirmation + needsAttention in admin list", sv465Row?.needsConfirmation === true && sv465Row?.needsAttention === true, JSON.stringify(sv465Row));
  const sv6cRow = products.data?.items?.find((p) => p.baseCode === "SP000019" || /SV6C/i.test(p.name));
  const product = await adminCall("GET", `/api/admin/products/${sv6cRow.id}`);
  const edited = structuredClone(product.data);
  const gói = edited.skus.find((s) => s.isBase);
  const oldPrice = gói.price;
  gói.price = oldPrice + 1000;
  const put = await adminCall("PUT", `/api/admin/products/${sv6cRow.id}`, edited);
  check("admin price edit saved; history has old/new", put.status === 200 && put.data?.priceHistory?.some((h) => h.oldPrice === oldPrice && h.newPrice === oldPrice + 1000), put.text.slice(0, 300));
  const stale = await adminCall("PUT", `/api/admin/products/${sv6cRow.id}`, edited);
  check("stale version -> 409 VERSION_CONFLICT", stale.status === 409 && stale.data?.code === "VERSION_CONFLICT", stale.text.slice(0, 200));
  // restore the price so the demo data stays as printed
  const fresh = (await adminCall("GET", `/api/admin/products/${sv6cRow.id}`)).data;
  fresh.skus.find((s) => s.isBase).price = oldPrice;
  const restore = await adminCall("PUT", `/api/admin/products/${sv6cRow.id}`, fresh);
  check("price restored to the printed value", restore.status === 200 && restore.data?.skus?.find((s) => s.isBase)?.price === 31000, restore.text.slice(0, 200));

  // ---- bank settings: MANAGER only + password re-entry ----
  const badPw = await adminCall("PUT", "/api/admin/settings/bank", { bankName: "X", bin: "970422", accountNo: "123", accountName: "X", currentPassword: "not-the-password" });
  check("bank settings with wrong current password rejected", badPw.status === 403, `status ${badPw.status}`);

  // ---- mail ----
  try {
    const mails = await call(null, "GET", `${MAILPIT}/api/v1/messages`);
    const subjects = (mails.data?.messages ?? []).map((m) => m.Subject);
    check("Mailpit received new order/quote notifications", subjects.some((s) => s?.includes(code)) && subjects.some((s) => s?.includes(quote.data?.code)), JSON.stringify(subjects.slice(0, 6)));
  } catch (e) {
    check("Mailpit reachable", false, String(e));
  }
} catch (err) {
  failed++;
  console.error("ABORTED:", err);
}

const passed = results.filter((r) => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ""}`);
process.exit(failed ? 1 : 0);
