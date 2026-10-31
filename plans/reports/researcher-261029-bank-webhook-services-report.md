# Bank-transfer auto-match services: SePay vs Casso vs payOS

Ngày: 2026-10-29. Tag: [V] = verified today on official page; [U] = unverified (search snippet, AI-summary of page, or not found). Pages summarised by a fetch tool, not read raw: numbers marked "[V-sum]" must be re-checked on the page before budgeting.

## 1. How each service works

| | SePay | Casso | payOS |
|---|---|---|---|
| Role | Notifier. Reads account balance changes, sends webhook. Money goes straight to company account. [V] | Notifier/data connector (bankHub/"Cas" for bank connectivity, Casso Flow reconciliation). [V] | Payment gateway: creates payment link, hosts checkout with VietQR/Napas 24/7. Money passes through payOS. [V] |
| Bank link | my.sepay.vn > Ngân hàng > Kết nối tài khoản. Bank-specific: bank login + OTP (e.g. VPBank NEO). Not internet-banking password to SePay (per SePay marketing). [U] | Bank link via bankHub; ACB example = credentials + OTP. Developers may use OAuth 2.0 for their users. [U] | N/A for notifier mode; payOS account on my.payos.vn. |
| Banks | "10+ major banks", partners NAPAS, Sacombank, ABBANK, VPBank, TPBank. Full list not found. [U] | Full list not found. [U] | Napas 24/7 payment via bank apps. [V] |
| Company account needed | Unknown. Business-linking doc exists for OCB (`ket-noi-ocb-api-doanh-nghiep`). [U] | Unknown. [U] | Business registration docs likely; not verified. [U] |
| Sources | https://docs.sepay.vn/ , https://docs.sepay.vn/ket-noi-ocb-api-doanh-nghiep.html , https://docs.sepay.vn/ket-noi-vpbank.html | https://casso.vn/ , https://developer.casso.vn | https://payos.vn/docs/ |

Notes:
- payOS is listed as a Casso product on casso.vn [V], so Casso and payOS may share a vendor. Confirm before treating them as independent options.
- Gateway (payOS) means funds settle via payOS; notifier (SePay, Casso) means funds stay in company account. For a one-company shop, notifier keeps money flow and bank dependency simpler; gateway adds a settlement party and KYC.

## 2. Webhook contract

### SePay [V] (https://docs.sepay.vn/tich-hop-webhooks.html)
- POST JSON. Fields: `id, gateway, transactionDate, accountNumber, subAccount, code, content, transferType ("in"), description, transferAmount, accumulated, referenceCode`.
- `code` = payment code extracted by SePay from content using configured prefix (example `SEVN63DC8E5C`). Extraction rule not on page. Prefix config exists (step 2 of setup). Our prefix `DNA` fits this model. [U on exact rule]
- Auth (choose per endpoint): HMAC-SHA256, API Key (`Authorization: Apikey <key>`), OAuth 2.0, or none. Use API Key over HTTPS, or HMAC if available.
- Expected response: HTTP 200/201 + body `{"success": true}` within 30 s, else failure.
- Retry CONFLICT: docs.sepay.vn tich-hop-webhooks (fetched) = up to 7 retries, Fibonacci-like, stops 5 h after first failure [V-sum]. developer.sepay.vn xu-ly-loi (search snippet) = 8 attempts total, ~33 min, then status Failed + alert after 3 consecutive failures [U, snippet]. Design for the worse case: assume a webhook can be lost; reconcile by API. Connect timeout 5 s.
- IP allowlist published (7 IPv4, 2 IPv6). [V]
- Test: "Gửi thử" button sends sample payload; real small transfer shows in webhook log. No sandbox. [V]

### Casso [U] (https://developer.casso.vn/webhook/gia-lap-giao-dich-den.md, index at https://developer.casso.vn/llms.txt)
- Webhook URL set in Casso UI; API key or OAuth tokens for API. Payload field names not extracted (fetch failed to show them). [U]
- Retry policy, IP allowlist, test tool: not confirmed. [U]

### payOS [V] (https://payos.vn/docs/du-lieu-tra-ve/webhook/)
- Top-level: `code, desc, success, data{orderCode, amount, description, accountNumber, reference, transactionDateTime, currency, paymentLinkId, code, desc, counterAccountBankId, counterAccountBankName, counterAccountName, counterAccountNumber, virtualAccountName, virtualAccountNumber}, signature`.
- `signature` present; algorithm (HMAC-SHA256 + checksum key, sorted fields?) not on this page. Check https://payos.vn/docs/tich-hop-webhook/kiem-tra-du-lieu-voi-signature/ . [U]
- Must return 2XX. Retry policy not stated. [U]
- Sandbox: https://payos.vn/docs/moi-truong-test (linked, not read). [U]
- Note: payOS matches by `orderCode` set at payment-link creation (merchant-supplied), not by parsing transfer content. Whether `orderCode` accepts `DNA...` strings (type is numeric in some payOS examples) [U]. Matching model differs from SePay/Casso. [V-derived]

## 3. Dynamic VietQR

| Option | Mechanism | Verified | Privacy | Verdict |
|---|---|---|---|---|
| Own EMVCo payload (`emvco.ts`, already planned) | We build TLV string + CRC16; render QR in browser | Standard is public; tag values [U] until checked against bank-app scan (plan step 5) | No third party sees account/amount | **Use** |
| SePay QR image | `GET .../img?acc=&bank=&amount=&des=&template=` | `https://qr.sepay.vn/banks.json` exists, 54 banks [V]. Image host conflicts: search snippet says `qr.sepay.vn/img`; SePay doc page says `https://vietqr.app/img` (params acc, bank, amount, des, template, download, showinfo, fullacc, holder). Canonical host [U]. Source: https://developer.sepay.vn/en/tien-ich-khac/tao-qr-code | Account no. + amount + memo in URL, sent to third-party host; logs unknown [U] | Fallback only |
| VietQR.io image / API | `img.vietqr.io/image/<BIN>-<ACC>-<TPL>.png?amount&addInfo&accountName`; POST `api.vietqr.io/v1/generate` with `x-api-key` from my.vietqr.io | Only third-party tutorials found; official page 404 [U] | Same as above | Not used (no verified official doc, key/tier unknown) |
| payOS payment link | API creates link per order; checkout page shows VietQR; amount fixed at creation [V: https://payos.vn/docs/] | Yes | Customer pays on payOS page | Only if gateway chosen |

Points:
- Dynamic QR = amount in payload. Amount must match confirmed total; re-issue on change (plan already has `reissue-amount`).
- Transfer content limit: plan regex `^[A-Z0-9]{1,25}$` is conservative; NAPAS field length [U].
- Self-generated QR has no network dependency for the shop page; SePay/VietQR image URLs would fail if a third-party host is down.

## 4. Pricing and limits

| | SePay | Casso | payOS |
|---|---|---|---|
| Free tier | FREE 0đ/mo, 50 tx/mo, 12 banks [V-sum] | No permanent free tier found. Flow trial 14 days / 100 tx [V] | "Cổng thanh toán miễn phí", "no intermediary fee", no contract, ~5 min signup [V-marketing] |
| Paid | STARTUP 120,000đ/mo, 180–986,000 tx/mo tiers [V-sum]; SHOP 99,000đ/store/mo or 840,000đ/yr, unlimited tx, 10 banks [V-sum]. Trial 14 days SHOP [V-sum] | Flow priced yearly by tx volume + banks; no VND figures published [V] | Fee schedule not published on payos.vn; "liên hệ tư vấn" [V] |
| Overage | Billed later at per-tx rate; rate not given [V] | n/a | n/a |
| Per-tx fee | Not stated in plan table [U] | Not stated [U] | Not stated; marketing says none [V-marketing] |
| Lock-in | No contract terms found; plan change via my.sepay.vn [V] | Not found [U] | "no contract" [V-marketing] |
| Bank account count | "no limit on linked accounts" [V-sum] | Not found [U] | Not found [U] |

Sources: https://docs.sepay.vn/goi-dich-vu.html , https://sepay.vn/bang-gia.html (both via summarising fetch; re-check figures on the page before budgeting), https://casso.vn/bang-gia/ , https://payos.vn/

Assessment:
- Expected volume (tens of orders/month, plus non-order credits) fits SePay FREE (50 tx/mo) or STARTUP. Count must include all incoming transfers to the account, not only orders. [U on real count]
- All three are likely <= ~120k đ/month at this volume (estimate). Cost does not decide; architecture and reliability do.
- payOS "free" is marketing; as a gateway, settlement and refunds depend on payOS.

## 5. Risks

| Risk | Evidence | Mitigation in design |
|---|---|---|
| Bank alters transfer content (case, spaces, diacritics, truncation) | VietQR doc: content max 19 chars, no diacritics [U, snippet from api.vietqr.vn]; per-bank caps reported by third-party tutorial [U]. No official bank rule found | Use code only (9 chars, `DNA`+6), match normalised (uppercase, strip spaces/hyphens, O/0 rule from plan). Test with the chosen bank's app |
| Underpay / overpay / duplicate transfer | Not covered by any vendor page [U] | Match amount exact = total; mismatch -> review queue, not auto-PAID. Second transfer to same code -> review queue |
| Missed / late webhook | SePay retry window conflicts (5 h vs ~33 min) [V-sum vs U]; payOS retry not stated [U]; Casso not stated [U] | Scheduled poll of vendor transaction API (SePay api-giao-dich, Casso bank-account API exist per link lists [U]) reconciles last 24-48 h; staff manual match in admin |
| Webhook endpoint down during deploy | Standard | Respond 200 fast, persist raw event first, process async |
| Duplicate delivery | SePay retries imply at-least-once [V-derived] | Unique key on vendor transaction id + bank reference; 200 on replay |
| Forged webhook | SePay: API Key / HMAC option [V]; payOS signature field [V], algorithm [U] | Require auth header/HMAC, constant-time compare, reject unauthenticated; IP allowlist as extra layer (SePay list [V]) |
| Vendor outage / shutdown / pricing change | No reputation data found (search returned no user complaints or incident pages) [U] | Keep vendor behind one port; manual bank-statement match as fallback |
| Data protection / ToS | Vendor sees account transactions (SePay/Casso connect to bank; payOS handles funds). Vietnam personal-data decree (13/2023/NĐ-CP) applicability [U, not checked today] | Read ToS before signup; limit stored fields (store raw event, mask account no. in logs) |
| Bank credential handling | SePay: OTP-based bank-side link, not password to SePay per marketing [U] | Do not store any bank credentials in our system |
| Gateway custody (payOS) | Money passes through payOS [V] | Only if accepted as gateway |

## 6. Recommendation and integration design

### Ranked choice
1. **SePay (notifier) + own EMVCo QR.** Money stays in company account; no custody. Webhook auth (API Key / HMAC), IP list, test-send, transaction API for reconciliation, payment-code prefix all documented [V]. Cheapest entry (FREE 50 tx/mo) [V-sum]. Weak points: retry window conflict [U], bank coverage for our bank [U until bank chosen], corporate-account link path not verified.
2. **Casso (notifier) + own EMVCo QR.** Same model; API key + OAuth documented [V, index only]. Ranked below SePay because webhook payload and auth header were NOT read (fetch failed), pricing not published, and docs show v1/v2 variants (possible staleness). Re-evaluate if SePay does not support our bank.
3. **payOS (gateway).** Only option where customer pays on vendor page, so it conflicts with the owner's on-page dynamic QR design. Adds custody, settlement party, second money path. "Free" claim is marketing only [V-marketing].
- Baseline without vendor: staff match bank statement by code + amount manually. Zero cost, zero integration, slow. Keep as fallback in all cases.

**When this is wrong:**
- Our bank is not in SePay's or Casso's list (check first; this single fact can flip the ranking).
- Company account cannot be linked as corporate (personal-only link) -> manual statement matching or payOS.
- Owner wants card/e-wallet payment -> gateway (payOS) becomes necessary.
- Volume jumps past FREE/STARTUP caps with many non-order credits.

### Decision needed (conflicts with existing plan; not applied)
- Owner: webhook auto-marks PAID. Plan RT#6: PAID is MANAGER-only.
- A) Exact match (code + amount + account + "in") -> system sets PAID, audit actor `BANK_WEBHOOK`. Fastest. Relies on webhook auth and exact amount; money cannot be redirected by this path, only a forged webhook could fake it, which auth blocks.
- B) Exact match -> order gets `PAID_MATCHED` flag; MANAGER one click confirms PAID. Keeps RT#6 control; tens of clicks/month. Customer sees "Đã nhận tiền" only after click.
- Recommendation: A for exact matches (auth + amount + code); everything else to review queue. Owner must choose.

### Minimal integration (Spring Boot API)
- Endpoint `POST /api/webhooks/bank/sepay` (public, no user auth, Caddy route, no Turnstile; reply 200 `{"success":true}` fast).
- Auth: `Authorization: Apikey <secret>` compared constant-time to env secret; 401 otherwise. Optional Caddy IP allowlist from SePay list [V].
- Persist first: `bank_transaction(vendor_id UNIQUE, raw JSON, amount, content, account_no, tx_time, status RECEIVED|MATCHED|REVIEW)`; duplicate vendor id -> 200 no-op.
- Matching: normalise content (uppercase, strip spaces/hyphens, remove diacritics); find `DNA[0-9A-HJKMNP-TV-Z]{6}`. Order must be BANK_TRANSFER + CONFIRMED + amount = total exactly + account = configured + direction in. Else `REVIEW` (unmatched, underpay, overpay, duplicate code, already paid).
- State: match -> PAID per decision above, audit row from/to. REVIEW never changes order state.
- Reconciliation job (every 30 min): pull vendor transactions for last 48 h via transaction API, run same pipeline (idempotent). Alert if REVIEW older than 24 h.
- Review queue: admin list of REVIEW rows; MANAGER links to an order or dismisses with note.
- Config: env for secret, account no., bank; no secrets in repo; mask account in logs.
- Tests: matcher unit tests (case, spaces, diacritics, code inside longer text, two codes); IT: no auth -> 401; replay -> one row; amount mismatch -> REVIEW; missed webhook -> reconcile creates row; already PAID -> no double transition.
- Live check: SePay "Gửi thử" + one real small transfer to company account [V for feature].

**Effort (ESTIMATE, not verified): ~6 person-days** — webhook + storage 1.5; matcher + state 1.5; review queue 1.5; reconciliation 1; tests + bank transfers 1. Excludes vendor account setup and bank linking (owner time).

## Unresolved questions
- Which bank? Decides SePay vs Casso vs manual. Check both supported-bank lists.
- Can the company (CÔNG TY TNHH) account be linked, and as corporate or personal?
- SePay retry window: 5 h (docs.sepay.vn) or ~33 min (developer.sepay.vn)? Read xu-ly-loi page.
- Casso webhook payload, auth header, retry, pricing: not read; fetch the webhook setup page.
- payOS signature algorithm and sandbox: not read.
- Exact SePay price table: taken from summarising fetch; re-check sepay.vn/bang-gia.html.
- QR host: qr.sepay.vn vs vietqr.app for SePay image endpoint; not needed if own EMVCo.
- Bank truncation/case behaviour: test with owner's bank app (plan step 5 already).
- Owner decision: A (auto PAID) vs B (one-click confirm), see section 6.
- Vietnam data-protection decree applicability to vendor ToS: not checked.

Status: DONE_WITH_CONCERNS
Summary: SePay is the top-ranked notifier option (money stays in company account, documented webhook auth and reconciliation API), with Casso second and payOS last (gateway, conflicts with on-page QR). Bank coverage, the SePay retry-window conflict, and owner's auto-PAID vs MANAGER-only decision must be resolved before build.
Concerns/Blockers: Casso webhook contract and payOS signature not read (fetch limits); SePay prices and retry window come from summarising fetch/search snippet; bank unknown.
