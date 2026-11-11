/** Brand marks for the contact links, drawn in white on the brand colour tile set by CSS. */

/** Zalo's wordmark; its brand blue comes from the tile. */
export function ZaloMark() {
  return (
    <span className="tp-zalo-mark" aria-hidden="true">
      Zalo
    </span>
  );
}

/** Facebook "f". */
export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M13.6 21v-7.6h2.6l.4-3.1h-3V8.4c0-.9.3-1.5 1.6-1.5h1.6V4.2c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.4-4 4.1v2.1H7.8v3.1h2.6V21h3.2z" />
    </svg>
  );
}

/** WhatsApp: a phone in a speech bubble. */
export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M3.6 20.4l1.2-4.3A8.4 8.4 0 1 1 8 19.3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        fill="currentColor"
        d="M9.3 7.7c.3-.1.6 0 .7.3l.7 1.6c.1.3 0 .5-.1.7l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.5-.2.7-.1l1.6.7c.3.1.4.4.3.7-.3 1-1.2 1.6-2.2 1.4-2.9-.6-5.2-2.9-5.8-5.8-.2-1 .4-1.9 1.2-2.4z"
      />
    </svg>
  );
}

/** WeChat: two overlapping speech bubbles. */
export function WeChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M9.4 3.8C5.3 3.8 2 6.5 2 9.9c0 1.9 1 3.6 2.7 4.7L4 17l2.8-1.4c.8.2 1.7.4 2.6.4h.4a5.4 5.4 0 0 1-.2-1.5c0-3.3 3.1-6 7.1-6h.4c-.6-2.6-3.6-4.7-7.7-4.7zM6.9 7.6a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm5 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z" />
      <path d="M22 14.6c0-2.8-2.7-5-6.1-5s-6.1 2.2-6.1 5 2.7 5 6.1 5c.7 0 1.3-.1 2-.3l2.2 1.1-.6-1.9c1.5-.9 2.5-2.3 2.5-3.9zm-8.3-1.3a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6zm4.3 0a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6z" />
    </svg>
  );
}
