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
