import type { PublicSettings } from "@/lib/api/types";
import { facebookHref, whatsappHref, zaloHref } from "@/lib/order/phone";
import { FacebookIcon, WhatsAppIcon } from "./brand-icons";
import { telHref } from "./shell-data";

/**
 * Floating WhatsApp / Facebook / Zalo / Gọi buttons in their brand colours, stacked from the bottom so a button the
 * admin left empty leaves no gap. Desktop only (CSS); mobile has the dock. WeChat has no link to a chat, so it is not
 * here; the contact band and the footer show its ID to copy.
 */
export function ContactBubble({
  settings,
}: {
  settings: PublicSettings | null;
}) {
  if (!settings) return null;
  const zalo = zaloHref(settings.zalo);
  const facebook = facebookHref(settings.facebook);
  const whatsapp = whatsappHref(settings.whatsapp);
  return (
    <div className="fabs">
      {whatsapp && (
        <a
          className="fab wa"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat WhatsApp"
        >
          <WhatsAppIcon />
          <small>WhatsApp</small>
        </a>
      )}
      {facebook && (
        <a
          className="fab fb"
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
    </div>
  );
}
