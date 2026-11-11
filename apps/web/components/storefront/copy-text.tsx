"use client";

import { useState } from "react";

/**
 * A value the customer copies rather than opens (a WeChat ID: WeChat has no web link to a chat). Shows the value and
 * copies it on click, saying so for two seconds; where the clipboard is blocked the value stays selectable.
 */
export function CopyText({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard refused (old browser, insecure page): the value is still on screen to select by hand
    }
  }
  return (
    <span className="tp-copy">
      <span className="tp-copy-v">{value}</span>
      <button
        type="button"
        className="tp-copy-b"
        onClick={() => void copy()}
        aria-label={`Sao chép ${label} ${value}`}
      >
        <i className="i i-copy" aria-hidden="true" />
        <span aria-live="polite">{copied ? "Đã chép" : "Sao chép"}</span>
      </button>
    </span>
  );
}
