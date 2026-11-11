import type { ReactNode } from "react";
import Image from "next/image";
import { Card } from "antd";

/** Centered card with the brand, shared by login, forgotten password and reset pages. */
export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#F7F5F1",
        padding: 24,
      }}
    >
      <Card
        style={{ width: 400, maxWidth: "100%", borderRadius: 8 }}
        styles={{ body: { padding: 32 } }}
      >
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <Image
            src="/images/tinphat/logo.png"
            alt="TÍN PHÁT"
            width={88}
            height={64}
            priority
            style={{ display: "block", margin: "0 auto" }}
          />
          <div style={{ color: "#6B7280", fontSize: 12, marginTop: 8 }}>
            Quản trị catalogue
          </div>
          <h1 style={{ margin: "20px 0 0", fontSize: 20, fontWeight: 700 }}>
            {title}
          </h1>
        </div>
        {children}
      </Card>
    </main>
  );
}
