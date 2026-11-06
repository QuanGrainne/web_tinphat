import type { Metadata } from "next";
import "./(storefront)/storefront.css";

export const metadata: Metadata = {
  title: "Không tìm thấy trang | TÍN PHÁT DECORD",
  robots: { index: false, follow: false },
};

/** Shown for URLs that match no route (the two route groups each bring their own root layout). */
export default function GlobalNotFound() {
  return (
    <html lang="vi">
      <body>
        <main className="wrap" style={{ padding: "64px 16px", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px" }}>Không tìm thấy trang</h1>
          <p style={{ margin: "0 0 24px", color: "#6B7280" }}>Đường dẫn không đúng hoặc trang đã được chuyển.</p>
          <a className="btn btn-pri" href="/">
            Về trang chủ
          </a>
        </main>
      </body>
    </html>
  );
}
