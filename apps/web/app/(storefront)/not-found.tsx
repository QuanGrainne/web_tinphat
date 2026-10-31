import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="empty">
        <b>Không tìm thấy trang</b>
        <p>Liên kết có thể đã đổi hoặc sản phẩm không còn bán.</p>
        <Link className="btn btn-pri" href="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  );
}
