"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SECTION_NAV_EVENT, SectionLink } from "./section-link";

export interface NavLinkItem {
  href: string;
  label: string;
  /** id of a page section; when it is on the current page the link scrolls there instead of navigating */
  section?: string;
}

/** A section counts as "being read" once its top passes this share of the window height. */
const READ_LINE = 0.4;
/** Height of the pinned menu bar: a section scrolled up behind it no longer counts. */
const BAR = 44;

/**
 * Menu bar links. Exactly one item is highlighted: the section on screen (Năng lực, Liên hệ) when
 * there is one, otherwise the page you are on.
 */
export function NavLinks({ links }: { links: NavLinkItem[] }) {
  const pathname = usePathname();
  const sections = links.flatMap((link) =>
    link.section ? [link.section] : [],
  );
  const sectionKey = sections.join(",");
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const ids = sectionKey ? sectionKey.split(",") : [];
    let frame = 0;
    // after a click the chosen item stays lit while the page glides past other sections
    let pinnedUntil = 0;

    const measure = () => {
      frame = 0;
      if (Date.now() < pinnedUntil) return;
      const line = window.innerHeight * READ_LINE;
      let found: string | null = null;
      for (const id of ids) {
        const box = document.getElementById(id)?.getBoundingClientRect();
        if (box && box.top <= line && box.bottom > BAR) found = id;
      }
      setCurrent(found);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const onChosen = (event: Event) => {
      setCurrent((event as CustomEvent<string>).detail);
      pinnedUntil = Date.now() + 1200;
    };
    const onScrollEnd = () => {
      pinnedUntil = 0;
      onScroll();
    };

    frame = requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener(SECTION_NAV_EVENT, onChosen);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener(SECTION_NAV_EVENT, onChosen);
    };
  }, [sectionKey, pathname]);

  const onPage = (link: NavLinkItem) => {
    const path = link.href.split("#")[0];
    if (link.href.includes("#")) return false;
    return path === "/"
      ? pathname === "/"
      : pathname === path || pathname.startsWith(`${path}/`);
  };

  return (
    <div className="mlinks">
      {links.map((link) => {
        const lit = current ? link.section === current : onPage(link);
        const ariaCurrent = onPage(link)
          ? ("page" as const)
          : link.section && link.section === current
            ? ("location" as const)
            : undefined;
        const props = {
          className: lit ? "on" : undefined,
          "aria-current": ariaCurrent,
        };
        return link.section ? (
          <SectionLink
            key={link.href}
            href={link.href}
            section={link.section}
            {...props}
          >
            {link.label}
          </SectionLink>
        ) : (
          <Link key={link.href} href={link.href} {...props}>
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
