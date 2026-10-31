"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavLinkItem {
  href: string;
  label: string;
}

/** Blue menu bar links; the current section is highlighted. Items that do not fit are clipped (CSS), not scrolled. */
export function NavLinks({ links }: { links: NavLinkItem[] }) {
  const pathname = usePathname();
  return (
    <div className="mlinks">
      {links.map((link) => {
        const on = link.href === "/" ? pathname === "/" : pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link key={link.href} href={link.href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
