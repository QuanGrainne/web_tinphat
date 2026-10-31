"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function StorefrontError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="wrap">
      <div className="empty" role="alert">
        <b>Không tải được dữ liệu</b>
        <p>Vui lòng thử lại sau ít phút.</p>
        <button type="button" className="btn btn-pri" onClick={reset}>
          Thử lại
        </button>{" "}
        <Link className="btn" href="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
