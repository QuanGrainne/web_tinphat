"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

/** Fired on window with the section id as detail when a SectionLink glides to a section. */
export const SECTION_NAV_EVENT = "tp:section-nav";

/**
 * A link to a page section. When that section is already on the current page it glides there
 * (an instant jump for people who ask for reduced motion); otherwise it navigates to href as usual.
 */
export function SectionLink({
  href,
  section,
  className,
  children,
  ...rest
}: {
  href: string;
  section: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page" | "location";
}) {
  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    // let new-tab and new-window clicks behave as normal links
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const target = document.getElementById(section);
    if (!target) return;
    event.preventDefault();
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
    // tell the menu bar which section was chosen, so it highlights it at once
    window.dispatchEvent(
      new CustomEvent(SECTION_NAV_EVENT, { detail: section }),
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick} {...rest}>
      {children}
    </Link>
  );
}
