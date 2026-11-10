"use client";

import { useEffect, useState } from "react";
import type { BankInfo } from "@/lib/api/types";
import { formatVnd } from "@/lib/format/money";
import { buildVietQrPayload } from "@/lib/vietqr/emvco";

type TransferBank = BankInfo & { content: string };

/** Copies text; falls back to a temporary textarea where the Clipboard API needs a secure context. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <button
      type="button"
      className="cp"
      aria-label={`Chép ${label}`}
      onClick={async () => setCopied(await copyText(text))}
    >
      <i className="i i-copy" aria-hidden="true" />
      <span aria-live="polite">{copied ? "Đã chép" : "Chép"}</span>
    </button>
  );
}

/** Bank, account, account name, optional amount and transfer content as text, with copy buttons for the two that get typed. */
export function BankKv({
  bank,
  amount,
}: {
  bank: TransferBank;
  amount?: number | null;
}) {
  return (
    <dl className="kv">
      {amount ? (
        <>
          <dt>Số tiền</dt>
          <dd className="code cp-row">
            <span>{formatVnd(amount)}</span>
          </dd>
        </>
      ) : null}
      <dt>Nội dung</dt>
      <dd className="code cp-row">
        <span>{bank.content}</span>
        <CopyButton text={bank.content} label="nội dung chuyển khoản" />
      </dd>
      <dt>Ngân hàng</dt>
      <dd>{bank.bankName}</dd>
      <dt>Số tài khoản</dt>
      <dd className="mono cp-row">
        <span>{bank.accountNo}</span>
        <CopyButton
          text={bank.accountNo.replace(/\s+/g, "")}
          label="số tài khoản"
        />
      </dd>
      <dt>Chủ tài khoản</dt>
      <dd>{bank.accountName}</dd>
    </dl>
  );
}

type QrState = { payload: string; svg: string | null; failed: boolean };

/**
 * VietQR for a confirmed amount, always next to the same details as text so the customer can still pay
 * when the QR cannot be drawn.
 */
export function VietQrSvg({
  bank,
  amount,
}: {
  bank: TransferBank;
  amount: number;
}) {
  const [state, setState] = useState<QrState | null>(null);
  const { bin, accountNo, content } = bank;

  useEffect(() => {
    let cancelled = false;
    const finish = (svg: string | null) => {
      if (!cancelled)
        setState({
          payload: `${bin}|${accountNo}|${content}|${amount}`,
          svg,
          failed: svg === null,
        });
    };
    (async () => {
      try {
        const payload = buildVietQrPayload({ bin, accountNo, content, amount });
        const mod = await import("qrcode");
        // qrcode is CommonJS: depending on the bundler its API sits on the namespace or on its default export
        const lib = mod.default ?? mod;
        const svg = await lib.toString(payload, { type: "svg", margin: 1 });
        finish(svg.trimStart().startsWith("<svg") ? svg : null);
      } catch {
        finish(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bin, accountNo, content, amount]);

  const current =
    state?.payload === `${bin}|${accountNo}|${content}|${amount}`
      ? state
      : null;

  return (
    <div className={`qr-in${current?.failed ? " no-qr" : ""}`}>
      {current?.failed ? null : current?.svg ? (
        // The SVG is produced locally by the qrcode library from a payload built out of validated fields.
        <div
          className="qr-box"
          role="img"
          aria-label="Mã QR chuyển khoản"
          dangerouslySetInnerHTML={{ __html: current.svg }}
        />
      ) : (
        <div className="qr-box wait" aria-hidden="true">
          <i className="i i-qr" style={{ width: 56, height: 56 }} />
        </div>
      )}
      <div>
        {current?.failed ? (
          <p className="note" role="status" style={{ marginBottom: 8 }}>
            Không tạo được mã QR. Vui lòng chuyển khoản theo thông tin dưới đây.
          </p>
        ) : null}
        <BankKv bank={bank} amount={amount} />
      </div>
    </div>
  );
}
