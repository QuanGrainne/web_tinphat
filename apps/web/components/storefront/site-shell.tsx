import type { ReactNode } from "react";
import { connection } from "next/server";
import { ContactBubble } from "./contact-bubble";
import { ContactCta } from "./tinphat-sections";
import { MobileDock } from "./mobile-dock";
import { loadNav, loadSettings } from "./shell-data";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Header, footer, mobile dock and contact bubble around every storefront page.
 * Pages render their own <main>. Rendered per request (connection) so `next build` never calls the API.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  await connection();
  const [nav, settings] = await Promise.all([loadNav(), loadSettings()]);
  return (
    <>
      <SiteHeader nav={nav} settings={settings} />
      {children}
      <ContactCta settings={settings} />
      <SiteFooter nav={nav} settings={settings} />
      <ContactBubble settings={settings} />
      <MobileDock nav={nav} />
    </>
  );
}
