import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { SiteShell } from "@/components/storefront/site-shell";
import "./storefront.css";

const inter = Inter({ subsets: ["latin", "vietnamese"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DNA_SITE_URL ?? "http://localhost:8000"),
  title: { default: "DNA Hoàng Nguyên", template: "%s | DNA Hoàng Nguyên" },
  description: "Giấy tiêu dùng, pin và học cụ sáng tạo. Giá đã gồm VAT.",
};

export default function StorefrontRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={inter.className}>
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
