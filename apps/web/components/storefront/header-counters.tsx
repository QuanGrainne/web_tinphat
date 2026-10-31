"use client";

import Link from "next/link";
import { countLines, useCart } from "@/lib/cart/cart-store";

function countLabel(n: number): string {
  return n > 0 ? `${n} sản phẩm` : "Chưa có";
}

/** Báo giá / Tra cứu đơn / Giỏ hàng with live basket counters (the stored baskets are only known in the browser). */
export function HeaderCounters() {
  const cart = useCart();
  const quote = countLines(cart, "quote");
  const order = countLines(cart, "order");
  return (
    <nav className="hd-act" aria-label="Tiện ích">
      <Link className="act act-q" href="/bao-gia">
        <span className="act-ico">
          <i className="i i-doc" aria-hidden="true" />
        </span>
        <span className="act-t">
          <b>Báo giá</b>
          <small>{countLabel(quote)}</small>
        </span>
      </Link>
      <Link className="act act-o" href="/tra-cuu-don">
        <span className="act-ico">
          <i className="i i-box" aria-hidden="true" />
        </span>
        <span className="act-t">
          <b>Tra cứu đơn</b>
          <small>Đơn của bạn</small>
        </span>
      </Link>
      <Link className="act act-c" href="/gio-hang" aria-label={order > 0 ? `Giỏ hàng, ${order} sản phẩm` : "Giỏ hàng"}>
        <span className="act-ico">
          <i className="i i-cart" aria-hidden="true" />
          {order > 0 && <em>{order}</em>}
        </span>
        <span className="act-t">
          <b>Giỏ hàng</b>
          <small>{countLabel(order)}</small>
        </span>
      </Link>
    </nav>
  );
}
