import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/storefront/site-shell";
import "./storefront.css";
import "./tinphat.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin", "vietnamese"], display: "swap", variable: "--font-display" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DNA_SITE_URL ?? "http://localhost:8000"),
  title: { default: "TÍN PHÁT DECORD | Sản xuất & Phân phối sản phẩm Decor", template: "%s | TÍN PHÁT DECORD" },
  description: "TÍN PHÁT DECORD chuyên sản xuất và phân phối các sản phẩm trang trí theo mùa và quanh năm.",
};

export default function StorefrontRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${inter.className} ${playfair.variable}`}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
