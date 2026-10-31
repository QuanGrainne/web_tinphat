"use client";

import { useState, type ReactNode } from "react";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import styles from "./products.module.css";

/** Collapsible card with a bold title, a muted subtitle and a chevron (KiotViet modal section). */
export function SectionCard({
  title,
  subtitle,
  defaultOpen = true,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={styles.sec}>
      <button type="button" className={styles.secHead} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span>
          {title}
          {subtitle && <small>{subtitle}</small>}
        </span>
        {open ? <UpOutlined style={{ fontSize: 11 }} /> : <DownOutlined style={{ fontSize: 11 }} />}
      </button>
      {/* Kept mounted while collapsed so form fields inside stay registered. */}
      <div className={styles.secBody} style={{ display: open ? undefined : "none" }}>
        {children}
      </div>
    </section>
  );
}
