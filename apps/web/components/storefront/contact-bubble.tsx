import type { PublicSettings } from "@/lib/api/types";
import { facebookHref, zaloHref } from "@/lib/order/phone";
import { FacebookIcon } from "./brand-icons";
import { telHref } from "./shell-data";

/** Floating Facebook / Zalo / Gọi buttons in their brand colours. Desktop only (CSS); mobile has the dock. */
export function ContactBubble({
  settings,
}: {
  settings: PublicSettings | null;
}) {
  if (!settings) return null;
  const zalo = zaloHref(settings.zalo);
  const facebook = facebookHref(settings.facebook);
  return (
    <>
      {facebook && (
        <a
          className={zalo ? "fab fb" : "fab fb solo"}
          href={facebook}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
        >
          <FacebookIcon />
          <small>Facebook</small>
        </a>
      )}
      {zalo && (
        <a
          className="fab z"
          href={zalo}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo"
        >
          <i className="i i-chat" aria-hidden="true" />
          <small>Zalo</small>
        </a>
      )}
      <a
        className="fab"
        href={telHref(settings.hotline)}
        aria-label={`Gọi hotline ${settings.hotline}`}
      >
        <i className="i i-phone" aria-hidden="true" />
        <small>Gọi</small>
      </a>
    </>
  );
}
