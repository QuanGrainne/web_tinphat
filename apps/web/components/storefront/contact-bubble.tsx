import type { PublicSettings } from "@/lib/api/types";
import { telHref } from "./shell-data";

/** Floating Gọi / Zalo buttons. Desktop only (CSS); mobile has the hotline icon in the header. */
export function ContactBubble({ settings }: { settings: PublicSettings | null }) {
  if (!settings) return null;
  const zalo = settings.zalo?.replace(/\s+/g, "");
  return (
    <>
      {zalo && (
        <a
          className="fab z"
          href={`https://zalo.me/${encodeURIComponent(zalo)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo"
        >
          <i className="i i-chat" aria-hidden="true" />
          <small>Zalo</small>
        </a>
      )}
      <a className="fab" href={telHref(settings.hotline)} aria-label={`Gọi hotline ${settings.hotline}`}>
        <i className="i i-phone" aria-hidden="true" />
        <small>Gọi</small>
      </a>
    </>
  );
}
